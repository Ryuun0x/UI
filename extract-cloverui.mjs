import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const input=fileURLToPath(new URL('../../Maintenance/CloverHub(StealAnEgg).lua',import.meta.url));
export const source=fs.readFileSync(input,'utf8').replace(/\r\n/g,'\n');
function between(a,b){
    const start=source.indexOf(a),end=source.indexOf(b,start);
    assert(start>=0&&end>start,`Missing extraction boundary: ${a}`);
    return source.slice(start,end);
}
function clean(text){
    return text.split('\n').map(line=>{
        let quote=null;
        for(let i=0;i<line.length;i++){
            if(quote){if(line[i]==='\\'){i++;continue;}if(line[i]===quote)quote=null;}
            else if(line[i]==='"'||line[i]==="'")quote=line[i];
            else if(line.slice(i,i+2)==='--')return line.slice(0,i).trimEnd();
        }
        return line.trimEnd();
    }).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function build(){
    let kit=between('local function MakeCollapsible(','-- [[ 2. HELPERS ]] --');
    kit=kit.replaceAll('getgenv().__CHSAE_ConfigControllers','context.ConfigControllers')
        .replaceAll('getgenv().__CHSAE_RuntimeConns','context.Connections');
    const window=between('-- Keep one compact visibility control','Window.__AccountTab = Window:AddTab(');
    let scrolling=between('Window.__ApplyMobileScrollFix = function(onlyTab)','-- HOME layout:');
    scrolling=scrolling.replace(/onlyTab and \{ onlyTab \} or \{[\s\S]*?\}\) do/,'onlyTab and { onlyTab } or tabs) do');
    const controls=between('-- [[ DROPDOWN / INPUT HEIGHT + CORNER PATCH + LAZY DROPDOWN LISTS ]] --','-- [[ 4. SETTINGS STATE ]] --');
    const cards=between('    local GAP         = 4\n','    getgenv().__CHCardifyBox = cardifyBox');
    let polish=between('    -- UI polish: cap corner radii','-- [[ COLLAPSIBLE GROUPBOXES ]] --');
    polish=polish.replace(/\nend\)\s*$/,'');
    const findStart=polish.indexOf('        local function findObsidian()');
    const findEnd=polish.indexOf('        local obs = findObsidian()',findStart);
    assert(findStart>=0&&findEnd>findStart);
    polish=polish.slice(0,findStart)+'        local obs = Library.ScreenGui'+polish.slice(findEnd+'        local obs = findObsidian()'.length);
    return `local CloverUI = { Version = "1.0.0", ObsidianRevision = "fa7be5477c30e4a302cc60c85e93ecca926d297b" }

function CloverUI.Install(Library, context)
    assert(type(Library) == "table", "CloverUI requires the existing Obsidian library")
    if Library.__CloverUI then return Library.__CloverUI end
    assert(type(context) == "table" and type(context.IsAlive) == "function", "CloverUI requires session lifetime")
    assert(type(context.Connections) == "table", "CloverUI requires unload-owned connections")
    assert(type(context.ConfigControllers) == "table", "CloverUI requires a config controller registry")
    local TweenService = game:GetService("TweenService")
    local RunService = game:GetService("RunService")
    local LocalPlayer = game:GetService("Players").LocalPlayer
    local stopped = false
    local function sessionAlive() return not stopped and context.IsAlive() end

${clean(kit)}

    local ui = {
        Version = CloverUI.Version,
        Library = Library,
        CHK = CHK,
        MakeCollapsible = MakeCollapsible,
        BindThemeProperty = BindThemeProperty,
        CardThemeColor = CardThemeColor,
        StyleGroupboxPanel = StyleGroupboxPanel,
        MakeTargetOverlay = MakeTargetOverlay,
        BindDropdownOverlay = BindDropdownOverlay,
        MakeButtonPanel = MakeButtonPanel,
        SafeNotify = SafeNotify,
    }
    local installedNotify = Library.Notify
    function ui:Disconnect()
        if stopped then return end
        stopped = true
        table.clear(_notificationQueue)
        if Library.Notify == installedNotify then Library.Notify = originalNotify end
        if Library.__CloverUI == self then Library.__CloverUI = nil end
    end
    context.Connections[#context.Connections + 1] = ui

    function ui.StyleWindow(Window)
        if Window.__CloverStyled then return end
        Window.__CloverStyled = true
${clean(window)}
    end

    function ui.StyleTabs(Window, tabs)
        for _, button in ipairs(Library.TabButtons) do
            button.Label.Font = Enum.Font.RobotoMono
            button.Label.TextSize = 16
            button.Label.RichText = false
        end
${clean(scrolling)}
    end

    function ui.PatchControls(SessionBox)
        local methods = getmetatable(SessionBox).__index
        if methods.__CloverPatched then return end
        methods.__CloverPatched = true
${clean(controls)}
    end

${clean(cards)}
    CHK.CardifyBox = cardifyBox
    ui.CardifyBox = cardifyBox
    function ui.StyleBoxes(boxes)
        for _, box in ipairs(boxes) do
            pcall(StyleGroupboxPanel, box)
            pcall(cardifyBox, box)
        end
    end
    function ui.Polish()
        if ui.polished then return end
        ui.polished = true
${clean(polish)}
    end
    Library.__CloverUI = ui
    return ui
end

return CloverUI
`;
}
if(process.argv.includes('--patch')){
    process.stdout.write('*** Begin Patch\n*** Add File: '+fileURLToPath(new URL('./cloverui.lua',import.meta.url))+'\n'+build().trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n');
}
