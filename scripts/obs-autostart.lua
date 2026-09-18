obs = obslua

local script_dir = debug.getinfo(1, "S").source:match("@?(.*[/\\])")

function script_description()
    return "Respaldo: arranca el servidor de Confluence (oculto) si todavia no esta corriendo al abrir OBS.\n\n" ..
        "Confluence ahora se auto-arranca con el inicio de sesion de Windows (tarea programada 'Confluence Autostart'), " ..
        "para que ya este listo antes de que los Custom Browser Docks de OBS intenten cargarlo. " ..
        "Este script ya NO detiene el servidor al cerrar OBS: Confluence queda corriendo en segundo plano " ..
        "de forma independiente. Si necesitas apagarlo manualmente, corre scripts\\stop.ps1."
end

function script_load(settings)
    local vbs = script_dir .. "start-hidden.vbs"
    os.execute('wscript.exe "' .. vbs .. '"')
end
