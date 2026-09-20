import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {source,build as buildUI} from './extract-cloverui.mjs';

export const testBuild='2026-09-20-v3.0-cloverui-local-test-r1';
export const modulePath='CloverHub/StealAnEgg/ui-test/cloverui.lua';
export function buildTest(){
    let text=source;
    const edits=[];
    function change(start,end,value){
        const at=text.indexOf(start),until=text.indexOf(end,at);
        assert(at>=0&&until>at,`Missing integration landmark ${start}`);
        const original=text.slice(at,until);
        text=text.slice(0,at)+value+text.slice(until);
        edits.push({original,replacement:value});
    }
    function replace(original,replacement){
        assert(text.includes(original),`Missing ${original}`);
        text=text.replace(original,replacement);edits.push({original,replacement});
    }
    replace('2026-09-20-v3.0-cloverui-r43',testBuild);
    replace('2026-09-20-v3.0-cloverui-r43',testBuild);
    replace('getgenv().__CHSAE_PayloadReady = nil',`local CloverUI
do
    local ok, result = pcall(function()
        assert(type(readfile) == "function", "Executor readfile is required for the local UI test")
        local chunk, issue = loadstring(readfile("${modulePath}"), "CloverHub/UI-Test")
        assert(chunk, issue)
        local module = chunk()
        assert(type(module) == "table" and module.Version == "1.0.0"
            and module.ObsidianRevision == "fa7be5477c30e4a302cc60c85e93ecca926d297b"
            and type(module.Install) == "function", "CloverUI local version mismatch")
        return module
    end)
    if not ok then
        getgenv().__CHSAE_AutoExecute.loading = false
        warn("[CloverHub UI Test] Existing hub left running: " .. tostring(result))
        return
    end
    CloverUI = result
end
getgenv().__CHSAE_PayloadReady = nil`);
    change('local function MakeCollapsible(','-- [[ 2. HELPERS ]] --',`getgenv().__CHSAE_RuntimeConns = getgenv().__CHSAE_RuntimeConns or {}
local UI = CloverUI.Install(Library, {
    IsAlive = sessionAlive,
    Connections = getgenv().__CHSAE_RuntimeConns,
    ConfigControllers = getgenv().__CHSAE_ConfigControllers,
})
local CHK = UI.CHK
local MakeCollapsible = UI.MakeCollapsible
local BindThemeProperty = UI.BindThemeProperty
local CardThemeColor = UI.CardThemeColor
local StyleGroupboxPanel = UI.StyleGroupboxPanel
local MakeTargetOverlay = UI.MakeTargetOverlay
local BindDropdownOverlay = UI.BindDropdownOverlay
local MakeButtonPanel = UI.MakeButtonPanel
local SafeNotify = UI.SafeNotify

`);
    change('-- Keep one compact visibility control','Window.__AccountTab = Window:AddTab(', 'UI.StyleWindow(Window)\n\n');
    change('-- Keep sidebar lettering consistent,','HomeTab:Show()', `UI.StyleTabs(Window, {
    HomeTab, EggTab, ProgressionTab, SellTab, EventTab,
    Window.__WebhookTab, Window.__AccountTab, SettingsTab,
})
`);
    change('-- Obsidian currently builds each tab as two nested,','-- HOME layout:', '');
    change('-- [[ DROPDOWN / INPUT HEIGHT + CORNER PATCH + LAZY DROPDOWN LISTS ]] --','-- [[ 4. SETTINGS STATE ]] --', 'UI.PatchControls(SessionBox)\n\n');
    const boxesStart=text.indexOf('    local ALL_BOXES = {');
    const boxesEnd=text.indexOf('    for _, b in ipairs(ALL_BOXES)',boxesStart);
    assert(boxesStart>0&&boxesEnd>boxesStart);
    const boxes=text.slice(boxesStart,boxesEnd);
    change('-- [[ UI STYLING PASS — the CloverHub look ]] --','-- [[ COLLAPSIBLE GROUPBOXES ]] --',`pcall(function()
${boxes}    UI.StyleBoxes(ALL_BOXES)
    getgenv().__CHCardifyBox = UI.CardifyBox
    UI.Polish()
end)

`);
    replace('    spawnBox(true)\n','');
    replace('Footer           = RELEASE_VERSION .. "  •  Steal An Egg",','Footer           = RELEASE_VERSION .. "  •  Steal An Egg • UI TEST",');
    return {text,edits};
}
export function verifyPreserved(candidate,edits){
    for(const {original,replacement} of [...edits].reverse()){
        // Deletions use a unique adjacent landmark in the source, rather than an empty match.
        if(replacement==='')continue;
        assert(candidate.includes(replacement),'missing integration adapter');
    }
    const baseline=source.slice(source.indexOf('-- [[ 4. SETTINGS STATE ]] --'),source.indexOf('-- [[ UI STYLING PASS'));
    const actual=candidate.slice(candidate.indexOf('-- [[ 4. SETTINGS STATE ]] --'),candidate.indexOf('pcall(function()\n    local ALL_BOXES'));
    // The original banner preceding the styling pass remains in both.
    assert.equal(actual,baseline,'all settings, feature UI, gameplay workers and callbacks are unchanged');
}
if(process.argv.includes('--build')){
    const moduleFile=fileURLToPath(new URL('./cloverui.lua',import.meta.url));
    const module=fs.readFileSync(moduleFile,'utf8').replace(/\r\n/g,'\n');
    assert.equal(module.trimEnd(),buildUI().trimEnd());
    const {text,edits}=buildTest();verifyPreserved(text,edits);
    const out=fileURLToPath(new URL('./local-test/',import.meta.url));
    fs.mkdirSync(out,{recursive:true});
    fs.writeFileSync(path.join(out,'CloverHub-UI-Test.lua.txt'),text);
    fs.writeFileSync(path.join(out,'cloverui.lua.txt'),module);
    console.log(JSON.stringify({build:testBuild,output:out,sourceSHA256:createHash('sha256').update(source).digest('hex'),bytes:Buffer.byteLength(text)}));
}
