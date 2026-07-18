#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use std::{
    collections::BTreeMap,
    env, fs,
    path::{Component, Path, PathBuf},
    process::Command,
    thread,
    time::Duration,
    time::{SystemTime, UNIX_EPOCH},
};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Serialize)]
struct WorkspacePayload {
    kind: String,
    #[serde(rename = "projectName")]
    project_name: String,
    #[serde(rename = "displayName")]
    display_name: String,
    #[serde(rename = "filePath")]
    file_path: String,
    #[serde(rename = "rootPath")]
    root_path: String,
    #[serde(rename = "selectedPath")]
    selected_path: String,
    files: BTreeMap<String, String>,
    paths: Vec<String>,
    #[serde(rename = "assetIndex")]
    asset_index: BTreeMap<String, String>,
}

#[derive(Serialize)]
struct BinaryFilePayload {
    bytes: Vec<u8>,
    #[serde(rename = "mimeType")]
    mime_type: String,
}

#[derive(Serialize)]
struct ImageFilePayload {
    name: String,
    path: String,
    #[serde(rename = "previewUrl")]
    preview_url: String,
    #[serde(rename = "mimeType")]
    mime_type: String,
}

#[tauri::command]
fn open_markdown_file_dialog(app: tauri::AppHandle) -> Result<Option<WorkspacePayload>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .add_filter("Markdown Files", &["md", "markdown"])
        .pick_file(move |result| {
            let _ = tx.send(result);
        });
    match rx.recv() {
        Ok(Some(file_path)) => read_markdown_file_workspace(file_path.as_path().unwrap().to_path_buf()),
        Ok(None) => Ok(None),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn open_markdown_file_path(file_path: String) -> Result<Option<WorkspacePayload>, String> {
    let path = PathBuf::from(file_path);
    if !path.is_file() {
        return Err("The recent Markdown file no longer exists.".to_string());
    }
    read_markdown_file_workspace(path)
}

#[tauri::command]
fn pick_markdown_link_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .add_filter("Markdown Files", &["md", "markdown"])
        .pick_file(move |result| {
            let _ = tx.send(result);
        });
    Ok(rx.recv().ok().flatten().map(|file_path| file_path.as_path().unwrap().to_string_lossy().to_string()))
}

#[tauri::command]
fn read_text_file_path(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(file_path);
    if !path.is_file() || !is_markdown_path(&path) {
        return Err("The Markdown file no longer exists.".to_string());
    }
    fs::read_to_string(path).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_text_file_path(file_path: String, content: String) -> Result<(), String> {
    let path = PathBuf::from(file_path);
    if !is_markdown_path(&path) {
        return Err("Please select a Markdown file.".to_string());
    }
    fs::write(path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn pick_workspace_parent_dialog(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog().file().pick_folder(move |result| {
        let _ = tx.send(result);
    });
    Ok(rx.recv().ok().flatten().map(|file_path| file_path.as_path().unwrap().to_string_lossy().to_string()))
}

#[tauri::command]
fn create_workspace_dialog(
    app: tauri::AppHandle,
    project_name: String,
    parent_path: String,
) -> Result<Option<WorkspacePayload>, String> {
    let parent = if parent_path.trim().is_empty() {
        let (tx, rx) = std::sync::mpsc::channel();
        app.dialog().file().pick_folder(move |result| {
            let _ = tx.send(result);
        });
        match rx.recv() {
            Ok(Some(p)) => p.as_path().unwrap().to_path_buf(),
            _ => return Ok(None),
        }
    } else {
        PathBuf::from(parent_path)
    };
    if !parent.is_dir() {
        return Err("The selected project directory does not exist.".to_string());
    }
    let project_name = normalize_project_name(&project_name);
    let root = parent.join(&project_name);
    create_workspace_at(root, project_name)
}

#[tauri::command]
fn open_workspace_dialog(app: tauri::AppHandle) -> Result<Option<WorkspacePayload>, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog().file().pick_folder(move |result| {
        let _ = tx.send(result);
    });
    match rx.recv() {
        Ok(Some(root)) => read_workspace(root.as_path().unwrap().to_path_buf()),
        Ok(None) => Ok(None),
        Err(_) => Ok(None),
    }
}

#[tauri::command]
fn open_workspace_path(root_path: String) -> Result<Option<WorkspacePayload>, String> {
    let root = PathBuf::from(root_path);
    if !root.is_dir() {
        return Err("The recent project folder no longer exists.".to_string());
    }
    read_workspace(root)
}

#[tauri::command]
fn export_html_to_pdf_dialog(
    default_file_name: String,
    html: String,
) -> Result<Option<String>, String> {
    let Some(pdf_path) = pick_pdf_save_file(&default_file_name)? else {
        return Ok(None);
    };
    let temp_html = env::temp_dir().join(format!("pme-export-{}.html", timestamp_millis()));
    let temp_profile = env::temp_dir().join(format!("pme-edge-profile-{}", timestamp_millis()));
    fs::create_dir_all(&temp_profile).map_err(|error| error.to_string())?;
    fs::write(&temp_html, html).map_err(|error| error.to_string())?;

    let edge = find_edge_executable();
    let file_url = path_to_file_url(&temp_html);
    let output = command_no_window(&edge)
        .args([
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--allow-file-access-from-files",
            "--no-pdf-header-footer",
            "--print-to-pdf-no-header",
            "--virtual-time-budget=3000",
            &format!("--user-data-dir={}", temp_profile.to_string_lossy()),
            &format!("--print-to-pdf={}", pdf_path.to_string_lossy()),
            &file_url,
        ])
        .output()
        .map_err(|error| error.to_string());
    let output = output?;
    if !output.status.success() {
        let _ = fs::remove_file(&temp_html);
        let _ = fs::remove_dir_all(&temp_profile);
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    wait_for_pdf_file(&pdf_path)?;
    let _ = fs::remove_file(&temp_html);
    let _ = fs::remove_dir_all(&temp_profile);

    Ok(Some(pdf_path.to_string_lossy().to_string()))
}

#[tauri::command]
fn export_markdown_file_dialog(
    default_file_name: String,
    content: String,
) -> Result<Option<String>, String> {
    let Some(path) = pick_save_file(&default_file_name, "Markdown Files (*.md)|*.md", "md", "Export Markdown")? else {
        return Ok(None);
    };
    fs::write(&path, content).map_err(|error| error.to_string())?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn export_binary_file_dialog(default_file_name: String, bytes: Vec<u8>) -> Result<Option<String>, String> {
    let Some(path) = pick_save_file(&default_file_name, "ZIP Files (*.zip)|*.zip", "zip", "Export Package")? else {
        return Ok(None);
    };
    fs::write(&path, bytes).map_err(|error| error.to_string())?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn read_binary_file_path(file_path: String) -> Result<BinaryFilePayload, String> {
    let path = PathBuf::from(file_path);
    if !path.is_file() {
        return Err("The file no longer exists.".to_string());
    }
    let mime_type = image_mime(&path).or_else(|| video_mime(&path)).ok_or_else(|| "Please select an image or video file.".to_string())?;
    let bytes = fs::read(path).map_err(|error| error.to_string())?;
    Ok(BinaryFilePayload {
        bytes,
        mime_type: mime_type.to_string(),
    })
}

#[tauri::command]
fn pick_image_file_dialog() -> Result<Vec<ImageFilePayload>, String> {
    let Some(file_paths) = pick_image_files()? else {
        return Ok(Vec::new());
    };
    file_paths
        .into_iter()
        .map(read_image_file_payload)
        .collect()
}

#[tauri::command]
fn pick_video_file_dialog() -> Result<Vec<ImageFilePayload>, String> {
    let Some(file_paths) = pick_video_files()? else {
        return Ok(Vec::new());
    };
    file_paths
        .into_iter()
        .map(read_video_file_payload)
        .collect()
}

fn create_workspace_at(root: PathBuf, project_name: String) -> Result<Option<WorkspacePayload>, String> {
    fs::create_dir_all(root.join("assets")).map_err(|error| error.to_string())?;
    let readme = root.join("README.md");
    if !readme.exists() {
        fs::write(
            &readme,
            format!("# {}\n\nStart writing with PME.\n", project_name),
        )
        .map_err(|error| error.to_string())?;
    }
    read_workspace(root)
}

#[tauri::command]
fn write_text_file(root_path: String, path: String, content: String) -> Result<(), String> {
    let file_path = resolve_child(Path::new(&root_path), &path)?;
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(file_path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_binary_file(root_path: String, path: String, bytes: Vec<u8>) -> Result<(), String> {
    let file_path = resolve_child(Path::new(&root_path), &path)?;
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(file_path, bytes).map_err(|error| error.to_string())
}

#[tauri::command]
fn remove_file(root_path: String, path: String) -> Result<(), String> {
    let file_path = resolve_child(Path::new(&root_path), &path)?;
    if file_path.exists() {
        fs::remove_file(file_path).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let file_path_arg = if args.len() > 1 {
        let path = &args[1];
        if path.ends_with(".md") || path.ends_with(".markdown") {
            Some(path.clone())
        } else {
            None
        }
    } else {
        None
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_markdown_file_dialog,
            open_markdown_file_path,
            pick_markdown_link_dialog,
            read_text_file_path,
            write_text_file_path,
            pick_workspace_parent_dialog,
            create_workspace_dialog,
            open_workspace_dialog,
            open_workspace_path,
            export_html_to_pdf_dialog,
            export_markdown_file_dialog,
            export_binary_file_dialog,
            read_binary_file_path,
            pick_image_file_dialog,
            pick_video_file_dialog,
            write_text_file,
            write_binary_file,
            remove_file,
            read_config_file,
            write_config_file,
            get_command_line_file,
        ])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();
            if let Some(file_path) = file_path_arg {
                window.emit("open-file-from-cli", file_path).unwrap();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running PME");
}

fn get_user_config_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        if let Ok(userprofile) = env::var("USERPROFILE") {
            return Ok(PathBuf::from(userprofile));
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(home) = env::var("HOME") {
            return Ok(PathBuf::from(home));
        }
    }
    Err("Failed to get user home directory.".to_string())
}

#[tauri::command]
fn read_config_file() -> Result<Option<String>, String> {
    let config_path = get_user_config_dir()?.join(".pme").join("config.json");
    if !config_path.exists() {
        return Ok(None);
    }
    fs::read_to_string(&config_path).map(Some).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_config_file(content: String) -> Result<(), String> {
    let config_path = get_user_config_dir()?.join(".pme").join("config.json");
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(&config_path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn get_command_line_file() -> Result<Option<String>, String> {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 1 {
        let path = &args[1];
        if path.ends_with(".md") || path.ends_with(".markdown") {
            return Ok(Some(path.clone()));
        }
    }
    Ok(None)
}

fn read_workspace(root: PathBuf) -> Result<Option<WorkspacePayload>, String> {
    let mut payload = WorkspacePayload {
        kind: "tauri".to_string(),
        project_name: root
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Untitled Workspace")
            .to_string(),
        display_name: root
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Untitled Workspace")
            .to_string(),
        file_path: String::new(),
        root_path: root.to_string_lossy().to_string(),
        selected_path: String::new(),
        files: BTreeMap::new(),
        paths: Vec::new(),
        asset_index: BTreeMap::new(),
    };

    collect_workspace_files(&root, &root, &mut payload)?;
    Ok(Some(payload))
}

fn read_markdown_file_workspace(file_path: PathBuf) -> Result<Option<WorkspacePayload>, String> {
    if !file_path.is_file() || !is_markdown_path(&file_path) {
        return Err("Please select a Markdown file.".to_string());
    }
    let root = file_path
        .parent()
        .ok_or_else(|| "The selected file has no parent folder.".to_string())?
        .to_path_buf();
    let file_name = file_path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| "Invalid Markdown file name.".to_string())?
        .to_string();
    let markdown = fs::read_to_string(&file_path).map_err(|error| error.to_string())?;
    let full_file_path = file_path.to_string_lossy().to_string();
    let mut payload = WorkspacePayload {
        kind: "tauri-file".to_string(),
        project_name: file_path
            .file_stem()
            .and_then(|name| name.to_str())
            .unwrap_or("Markdown")
            .to_string(),
        display_name: file_name.clone(),
        file_path: full_file_path.clone(),
        root_path: root.to_string_lossy().to_string(),
        selected_path: full_file_path.clone(),
        files: BTreeMap::new(),
        paths: vec![full_file_path.clone()],
        asset_index: BTreeMap::new(),
    };
    payload.files.insert(full_file_path, markdown.clone());
    collect_markdown_image_files(&root, &markdown, &mut payload)?;
    Ok(Some(payload))
}

fn read_image_file_payload(path: PathBuf) -> Result<ImageFilePayload, String> {
    if !path.is_file() {
        return Err("The image file no longer exists.".to_string());
    }
    let Some(mime_type) = image_mime(&path) else {
        return Err("Please select an image file.".to_string());
    };
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    let encoded = general_purpose::STANDARD.encode(bytes);
    Ok(ImageFilePayload {
        name: path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("image")
            .to_string(),
        path: path.to_string_lossy().to_string(),
        preview_url: format!("data:{};base64,{}", mime_type, encoded),
        mime_type: mime_type.to_string(),
    })
}

fn read_video_file_payload(path: PathBuf) -> Result<ImageFilePayload, String> {
    if !path.is_file() {
        return Err("The video file no longer exists.".to_string());
    }
    let Some(mime_type) = video_mime(&path) else {
        return Err("Please select a video file.".to_string());
    };
    Ok(ImageFilePayload {
        name: path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("video")
            .to_string(),
        path: path.to_string_lossy().to_string(),
        preview_url: path.to_string_lossy().to_string(),
        mime_type: mime_type.to_string(),
    })
}

#[cfg(target_os = "windows")]
fn command_no_window(program: &Path) -> Command {
    let mut command = Command::new(program);
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

#[cfg(not(target_os = "windows"))]
fn command_no_window(program: &Path) -> Command {
    Command::new(program)
}



#[cfg(target_os = "windows")]
fn pick_pdf_save_file(default_file_name: &str) -> Result<Option<PathBuf>, String> {
    pick_save_file(default_file_name, "PDF Files (*.pdf)|*.pdf", "pdf", "Export PDF")
}

#[cfg(not(target_os = "windows"))]
fn pick_pdf_save_file(_default_file_name: &str) -> Result<Option<PathBuf>, String> {
    Ok(None)
}



#[cfg(target_os = "windows")]
fn pick_image_files() -> Result<Option<Vec<PathBuf>>, String> {
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Insert Images'
$dialog.Filter = 'Image Files (*.png;*.jpg;*.jpeg;*.gif;*.webp;*.svg)|*.png;*.jpg;*.jpeg;*.gif;*.webp;*.svg'
$dialog.Multiselect = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  $dialog.FileNames | ForEach-Object { Write-Output $_ }
}
"#;
    let mut command = command_no_window(Path::new("powershell"));
    command.args(["-NoProfile", "-STA", "-WindowStyle", "Hidden", "-Command", script]);
    let output = command.output().map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let selected: Vec<PathBuf> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .collect();
    if selected.is_empty() {
        Ok(None)
    } else {
        Ok(Some(selected))
    }
}

#[cfg(not(target_os = "windows"))]
fn pick_image_files() -> Result<Option<Vec<PathBuf>>, String> {
    Ok(None)
}

#[cfg(target_os = "windows")]
fn pick_video_files() -> Result<Option<Vec<PathBuf>>, String> {
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Insert Videos'
$dialog.Filter = 'Video Files (*.mp4;*.webm;*.ogg;*.mov;*.avi;*.mkv)|*.mp4;*.webm;*.ogg;*.mov;*.avi;*.mkv'
$dialog.Multiselect = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  $dialog.FileNames | ForEach-Object { Write-Output $_ }
}
"#;
    let mut command = command_no_window(Path::new("powershell"));
    command.args(["-NoProfile", "-STA", "-WindowStyle", "Hidden", "-Command", script]);
    let output = command.output().map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let selected: Vec<PathBuf> = String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .map(PathBuf::from)
        .collect();
    if selected.is_empty() {
        Ok(None)
    } else {
        Ok(Some(selected))
    }
}

#[cfg(not(target_os = "windows"))]
fn pick_video_files() -> Result<Option<Vec<PathBuf>>, String> {
    Ok(None)
}

#[cfg(target_os = "windows")]
fn pick_save_file(
    default_file_name: &str,
    filter: &str,
    default_extension: &str,
    title: &str,
) -> Result<Option<PathBuf>, String> {
    let script = r#"
Add-Type -AssemblyName System.Windows.Forms
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.Title = $env:PME_SAVE_TITLE
$dialog.Filter = $env:PME_SAVE_FILTER
$dialog.DefaultExt = $env:PME_SAVE_EXTENSION
$dialog.AddExtension = $true
$dialog.FileName = $env:PME_DEFAULT_FILE_NAME
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  Write-Output $dialog.FileName
}
"#;
    let mut command = command_no_window(Path::new("powershell"));
    command.args(["-NoProfile", "-STA", "-WindowStyle", "Hidden", "-Command", script]);
    command.env("PME_DEFAULT_FILE_NAME", default_file_name);
    command.env("PME_SAVE_FILTER", filter);
    command.env("PME_SAVE_EXTENSION", default_extension);
    command.env("PME_SAVE_TITLE", title);
    let output = command.output().map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let selected = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if selected.is_empty() {
        Ok(None)
    } else {
        Ok(Some(PathBuf::from(selected)))
    }
}

#[cfg(not(target_os = "windows"))]
fn pick_save_file(
    _default_file_name: &str,
    _filter: &str,
    _default_extension: &str,
    _title: &str,
) -> Result<Option<PathBuf>, String> {
    Ok(None)
}

#[cfg(target_os = "windows")]
fn find_edge_executable() -> PathBuf {
    [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    .iter()
    .map(PathBuf::from)
    .find(|path| path.exists())
    .unwrap_or_else(|| PathBuf::from("msedge"))
}

#[cfg(not(target_os = "windows"))]
fn find_edge_executable() -> PathBuf {
    PathBuf::from("msedge")
}

fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0)
}

fn path_to_file_url(path: &Path) -> String {
    let path = path.to_string_lossy().replace('\\', "/");
    format!("file:///{}", percent_encode_path(&path))
}

fn percent_encode_path(path: &str) -> String {
    let mut encoded = String::new();
    for byte in path.bytes() {
        match byte {
            b'A'..=b'Z'
            | b'a'..=b'z'
            | b'0'..=b'9'
            | b'/'
            | b':'
            | b'-'
            | b'_'
            | b'.'
            | b'~' => encoded.push(byte as char),
            _ => encoded.push_str(&format!("%{:02X}", byte)),
        }
    }
    encoded
}

fn wait_for_pdf_file(path: &Path) -> Result<(), String> {
    for _ in 0..50 {
        if path.metadata().map(|metadata| metadata.len() > 0).unwrap_or(false) {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    Err("PDF file was not created.".to_string())
}

fn collect_workspace_files(
    root: &Path,
    current: &Path,
    payload: &mut WorkspacePayload,
) -> Result<(), String> {
    let entries = fs::read_dir(current).map_err(|error| error.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        let relative = path
            .strip_prefix(root)
            .map_err(|error| error.to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            payload.paths.push(format!("{}/", relative));
            collect_workspace_files(root, &path, payload)?;
            continue;
        }

        payload.paths.push(relative.clone());
        if is_markdown_path(&path) {
            payload.files.insert(
                relative,
                fs::read_to_string(&path).map_err(|error| error.to_string())?,
            );
        } else if let Some(mime) = image_mime(&path) {
            let bytes = fs::read(&path).map_err(|error| error.to_string())?;
            payload.files.insert(
                relative,
                format!(
                    "data:{};base64,{}",
                    mime,
                    general_purpose::STANDARD.encode(bytes)
                ),
            );
        }
    }
    Ok(())
}

fn collect_markdown_image_files(
    root: &Path,
    markdown: &str,
    payload: &mut WorkspacePayload,
) -> Result<(), String> {
    for image_path in extract_markdown_image_paths(markdown) {
        if is_remote_or_data_path(&image_path) {
            continue;
        }
        let normalized = image_path.replace('\\', "/");
        let candidate = if Path::new(&normalized).is_absolute() {
            PathBuf::from(&normalized)
        } else {
            root.join(&normalized)
        };
        if !candidate.is_file() || image_mime(&candidate).is_none() {
            continue;
        }
        let full_path = candidate.to_string_lossy().replace('\\', "/");
        if payload.files.contains_key(&full_path) {
            continue;
        }
        if let Some(mime) = image_mime(&candidate) {
            let bytes = fs::read(&candidate).map_err(|error| error.to_string())?;
            payload.paths.push(full_path.clone());
            payload.files.insert(
                full_path,
                format!(
                    "data:{};base64,{}",
                    mime,
                    general_purpose::STANDARD.encode(bytes)
                ),
            );
        }
    }
    Ok(())
}

fn extract_markdown_image_paths(markdown: &str) -> Vec<String> {
    let mut paths = Vec::new();
    for line in markdown.lines() {
        let mut rest = line;
        while let Some(start) = rest.find("![") {
            let after_start = &rest[start + 2..];
            let Some(label_end) = after_start.find("](") else {
                break;
            };
            let after_paren = &after_start[label_end + 2..];
            let Some(end) = after_paren.find(')') else {
                break;
            };
            let path = after_paren[..end].trim();
            if !path.is_empty() {
                paths.push(path.to_string());
            }
            rest = &after_paren[end + 1..];
        }

        for attr in ["src=\"", "src='"] {
            let mut html_rest = line;
            while let Some(start) = html_rest.find(attr) {
                let after = &html_rest[start + attr.len()..];
                let quote = if attr.ends_with('"') { '"' } else { '\'' };
                let Some(end) = after.find(quote) else {
                    break;
                };
                let path = after[..end].trim();
                if !path.is_empty() {
                    paths.push(path.to_string());
                }
                html_rest = &after[end + 1..];
            }
        }
    }
    paths
}

fn is_remote_or_data_path(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    lower.starts_with("http://")
        || lower.starts_with("https://")
        || lower.starts_with("data:")
        || lower.starts_with("blob:")
}

fn resolve_child(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let mut output = root.to_path_buf();
    for component in Path::new(relative).components() {
        match component {
            Component::Normal(part) => output.push(part),
            _ => return Err("Invalid workspace path".to_string()),
        }
    }
    Ok(output)
}

fn normalize_project_name(project_name: &str) -> String {
    let trimmed = project_name.trim();
    let name = if trimmed.is_empty() {
        "Untitled Workspace"
    } else {
        trimmed
    };
    name.chars()
        .map(|character| match character {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => character,
        })
        .collect()
}

fn is_markdown_path(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            extension.eq_ignore_ascii_case("md") || extension.eq_ignore_ascii_case("markdown")
        })
}

fn image_mime(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_str()?.to_ascii_lowercase();
    match extension.as_str() {
        "png" => Some("image/png"),
        "jpg" | "jpeg" => Some("image/jpeg"),
        "gif" => Some("image/gif"),
        "webp" => Some("image/webp"),
        "svg" => Some("image/svg+xml"),
        _ => None,
    }
}

fn video_mime(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_str()?.to_ascii_lowercase();
    match extension.as_str() {
        "mp4" => Some("video/mp4"),
        "webm" => Some("video/webm"),
        "ogg" => Some("video/ogg"),
        "mov" => Some("video/quicktime"),
        "avi" => Some("video/x-msvideo"),
        "mkv" => Some("video/x-matroska"),
        _ => None,
    }
}
