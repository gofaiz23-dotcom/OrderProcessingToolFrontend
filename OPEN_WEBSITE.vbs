Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptPath = fso.GetParentFolderName(WScript.ScriptFullName)

' Check if Node.js is installed
On Error Resume Next
Set nodeCheck = WshShell.Exec("node --version")
nodeCheck.StdOut.ReadAll
If Err.Number <> 0 Then
    MsgBox "Node.js is not installed! Please install Node.js from https://nodejs.org/", vbCritical, "Error"
    WScript.Quit
End If
On Error Goto 0

' Check if server is already running
Set objWMIService = GetObject("winmgmts:\\.\root\cimv2")
Set colItems = objWMIService.ExecQuery("SELECT * FROM Win32_Process WHERE CommandLine LIKE '%next dev%'")

serverRunning = False
For Each objItem in colItems
    serverRunning = True
    Exit For
Next

' If server is not running, start it
If Not serverRunning Then
    ' Check if node_modules exists
    If Not fso.FolderExists(scriptPath & "\node_modules") Then
        ' Show message that dependencies are being installed
        Set objShell = CreateObject("WScript.Shell")
        objShell.Popup "Installing dependencies for the first time. This may take a few minutes. Please wait...", 5, "Installing", vbInformation
    End If
    
    ' Start the server in background
    WshShell.Run """" & scriptPath & "\START_SERVER.bat""", 0, False
    
    ' Wait for server to start (longer wait if installing dependencies)
    If Not fso.FolderExists(scriptPath & "\node_modules") Then
        WScript.Sleep 30000 ' 30 seconds if installing
    Else
        WScript.Sleep 8000 ' 8 seconds if already installed
    End If
End If

' Open browser
WshShell.Run "http://localhost:3000", 1, False

