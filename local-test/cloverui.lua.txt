local CloverUI = { Version = "1.0.0", ObsidianRevision = "fa7be5477c30e4a302cc60c85e93ecca926d297b" }

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

local function MakeCollapsible(Groupbox, startsCollapsed)
    if not Groupbox.ToggleCollapsed then return end

    local Header
    for _, child in ipairs(Groupbox.Holder:GetChildren()) do
        if child:IsA("Frame") and child ~= Groupbox.Container and child.LayoutOrder == 0 then
            Header = child
            break
        end
    end
    if Header and not Header:FindFirstChild("FullHeaderCollapseButton") then
        local bounceScale = Header:FindFirstChild("GroupboxHeaderBounce")
        if not bounceScale then
            bounceScale = Instance.new("UIScale")
            bounceScale.Name = "GroupboxHeaderBounce"
            bounceScale.Scale = 1
            bounceScale.Parent = Header
        end
        local bounceTween
        local clickBtn = Instance.new("TextButton")
        clickBtn.Name = "FullHeaderCollapseButton"
        clickBtn.BackgroundTransparency = 1
        clickBtn.Size = UDim2.fromScale(1, 1)
        clickBtn.Text = ""
        clickBtn.AutoButtonColor = false
        clickBtn.ZIndex = Header.ZIndex + 10
        clickBtn.Parent = Header
        clickBtn.MouseButton1Click:Connect(function()
            Groupbox:ToggleCollapsed()
            if bounceTween then pcall(function() bounceTween:Cancel() end) end
            bounceScale.Scale = 0.985
            bounceTween = TweenService:Create(
                bounceScale,
                TweenInfo.new(0.18, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
                { Scale = 1 }
            )
            bounceTween:Play()
        end)
    end

    if startsCollapsed then
        Groupbox:SetCollapsed(true)
    end
end

local function BindThemeProperty(object, property, value)
    local properties = Library.Registry[object] or {}
    properties[property] = value
    Library:AddToRegistry(object, properties)
    object[property] = type(value) == "function" and value() or Library.Scheme[value]
end

local function CardThemeColor()
    return Library:GetBetterColor(Library.Scheme.MainColor, 3.5)
end

local function StyleGroupboxPanel(groupbox)
    local INSET    = 6
    local DIVIDER_H = 1
    local NATIVE_PAD_Y = 14

    local Holder    = groupbox.Holder
    local Container = groupbox.Container
    local List      = Container:FindFirstChildOfClass("UIListLayout")
    local HolderList = Holder:FindFirstChildOfClass("UIListLayout")

    if HolderList then
        HolderList.HorizontalAlignment = Enum.HorizontalAlignment.Center
    end

    BindThemeProperty(Container, "BackgroundColor3", "MainColor")
    Container.BackgroundTransparency = 0
    Container.BorderSizePixel     = 0

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 8)
    corner.Parent = Container

    local Header, titleLine
    for _, c in ipairs(Holder:GetChildren()) do
        if c:IsA("Frame") and c.LayoutOrder == 1 and c.Size.Y.Offset <= 2 then
            titleLine = c
        elseif c:IsA("Frame") and c ~= Container and c.LayoutOrder == 0 then
            Header = c
        end
    end

    local marginSpacer = Holder:FindFirstChild("GroupboxContentTopMargin")
    if not marginSpacer then
        marginSpacer = Instance.new("Frame")
        marginSpacer.Name = "GroupboxContentTopMargin"
        marginSpacer.BackgroundTransparency = 1
        marginSpacer.LayoutOrder = 2
        marginSpacer.Size = UDim2.new(1, 0, 0, INSET)
        marginSpacer.Parent = Holder
    end
    Container.LayoutOrder = 3

    groupbox.Resize = function(self, ...)
        local scale = Library.DPIScale or 1
        if scale <= 0 then scale = 1 end
        local headerH = Header and math.max(34, Header.AbsoluteSize.Y / scale) or 34
        local contentH = List.AbsoluteContentSize.Y / scale
        local containerH = contentH + NATIVE_PAD_Y
        Container.Size = UDim2.new(1, -INSET * 2, 0, containerH)
        if titleLine then titleLine.Visible = not self.Collapsed end
        if self.Collapsed then
            Holder.Size = UDim2.new(1, 0, 0, headerH)
            return
        end
        Holder.Size = UDim2.new(1, 0, 0, headerH + DIVIDER_H + INSET + containerH + INSET)
    end
    groupbox:Resize()
end

local MakeTargetOverlay
do

local SharedTargetOverlay
local function getSharedTargetOverlay()
    if SharedTargetOverlay then return SharedTargetOverlay end

    local parentGui = Library.ScreenGui
    if not parentGui then
        local ok, gui = pcall(function() return gethui and gethui() end)
        if ok then parentGui = gui end
    end
    if not parentGui then pcall(function() parentGui = game:GetService("CoreGui") end) end
    if not parentGui then parentGui = LocalPlayer:WaitForChild("PlayerGui") end

    local root = Instance.new("Frame")
    root.Name = "CloverHubSharedPicker"
    root.Size = UDim2.fromScale(1, 1)
    root.BackgroundColor3 = Color3.new(0, 0, 0)
    root.BackgroundTransparency = 0.45
    root.BorderSizePixel = 0
    root.ZIndex = 9000
    root.Visible = false
    root.Parent = parentGui

    local rootBtn = Instance.new("TextButton")
    rootBtn.BackgroundTransparency = 1
    rootBtn.Size = UDim2.fromScale(1, 1)
    rootBtn.Text = ""
    rootBtn.ZIndex = 9000
    rootBtn.Parent = root

    local panel = Instance.new("Frame")
    panel.AnchorPoint = Vector2.new(0.5, 0.5)
    panel.Position = UDim2.fromScale(0.5, 0.5)
    panel.Size = UDim2.fromOffset(560, 460)
    BindThemeProperty(panel, "BackgroundColor3", "BackgroundColor")
    panel.BorderSizePixel = 0
    panel.ZIndex = 9001
    panel.Active = true
    panel.Parent = root
    local panelCorner = Instance.new("UICorner")
    panelCorner.CornerRadius = UDim.new(0, 12)
    panelCorner.Parent = panel
    local panelStroke = Instance.new("UIStroke")
    BindThemeProperty(panelStroke, "Color", "OutlineColor")
    panelStroke.Thickness = 1
    panelStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    panelStroke.Parent = panel

    local titleBar = Instance.new("Frame")
    titleBar.Size = UDim2.new(1, 0, 0, 56)
    titleBar.BackgroundTransparency = 1
    titleBar.ZIndex = 9002
    titleBar.Active = true
    titleBar.Parent = panel

    local titleLabel = Instance.new("TextLabel")
    titleLabel.BackgroundTransparency = 1
    titleLabel.Position = UDim2.fromOffset(20, 14)
    titleLabel.Size = UDim2.new(1, -160, 0, 30)
    titleLabel.FontFace = Library.Scheme.Font
    titleLabel.TextSize = 22
    BindThemeProperty(titleLabel, "TextColor3", "FontColor")
    titleLabel.TextXAlignment = Enum.TextXAlignment.Left
    titleLabel.ZIndex = 9003
    titleLabel.Parent = titleBar

    local doneButton = Instance.new("TextButton")
    doneButton.AnchorPoint = Vector2.new(1, 0)
    doneButton.Position = UDim2.new(1, -16, 0, 12)
    doneButton.Size = UDim2.fromOffset(110, 34)
    BindThemeProperty(doneButton, "BackgroundColor3", "AccentColor")
    doneButton.Text = "Done"
    doneButton.FontFace = Library.Scheme.Font
    doneButton.TextSize = 15
    BindThemeProperty(doneButton, "TextColor3", "FontColor")
    doneButton.AutoButtonColor = true
    doneButton.ZIndex = 9003
    doneButton.Parent = titleBar
    local doneCorner = Instance.new("UICorner")
    doneCorner.CornerRadius = UDim.new(0, 8)
    doneCorner.Parent = doneButton
    pcall(function() Library:MakeDraggable(panel, titleBar, true, false) end)

    local card = Instance.new("Frame")
    card.Position = UDim2.fromOffset(16, 60)
    card.Size = UDim2.new(1, -32, 1, -76)
    BindThemeProperty(card, "BackgroundColor3", "MainColor")
    card.BorderSizePixel = 0
    card.ZIndex = 9001
    card.Parent = panel
    local cardCorner = Instance.new("UICorner")
    cardCorner.CornerRadius = UDim.new(0, 10)
    cardCorner.Parent = card
    local cardStroke = Instance.new("UIStroke")
    BindThemeProperty(cardStroke, "Color", "OutlineColor")
    cardStroke.Thickness = 1
    cardStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    cardStroke.Parent = card

    local search = Instance.new("TextBox")
    search.Position = UDim2.fromOffset(14, 14)
    search.Size = UDim2.new(1, -28, 0, 40)
    BindThemeProperty(search, "BackgroundColor3", "BackgroundColor")
    search.PlaceholderText = "Search items..."
    BindThemeProperty(search, "PlaceholderColor3", function() return Library:GetBetterColor(Library.Scheme.FontColor, -90) end)
    search.FontFace = Library.Scheme.Font
    search.TextSize = 16
    BindThemeProperty(search, "TextColor3", "FontColor")
    search.TextXAlignment = Enum.TextXAlignment.Left
    search.ClearTextOnFocus = false
    search.ZIndex = 9002
    search.Parent = card
    local searchCorner = Instance.new("UICorner")
    searchCorner.CornerRadius = UDim.new(0, 8)
    searchCorner.Parent = search
    local searchPadding = Instance.new("UIPadding")
    searchPadding.PaddingLeft = UDim.new(0, 14)
    searchPadding.Parent = search
    local searchStroke = Instance.new("UIStroke")
    BindThemeProperty(searchStroke, "Color", "OutlineColor")
    searchStroke.Thickness = 1
    searchStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    searchStroke.Parent = search

    local function miniButton(text, xOffset)
        local button = Instance.new("TextButton")
        button.AnchorPoint = Vector2.new(1, 0)
        button.Position = UDim2.new(1, xOffset, 0, 62)
        button.Size = UDim2.fromOffset(54, 24)
        BindThemeProperty(button, "BackgroundColor3", "BackgroundColor")
        button.Text = text
        button.FontFace = Library.Scheme.Font
        button.TextSize = 13
        BindThemeProperty(button, "TextColor3", "FontColor")
        button.ZIndex = 9003
        button.Parent = card
        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 6)
        corner.Parent = button
        local stroke = Instance.new("UIStroke")
        BindThemeProperty(stroke, "Color", "OutlineColor")
        stroke.Thickness = 1
        stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
        stroke.Parent = button
        return button
    end
    local noneButton = miniButton("None", -14)
    local allButton = miniButton("All", -74)

    local list = Instance.new("ScrollingFrame")
    list.Position = UDim2.fromOffset(14, 94)
    list.Size = UDim2.new(1, -28, 1, -108)
    BindThemeProperty(list, "BackgroundColor3", "BackgroundColor")
    list.BorderSizePixel = 0
    list.ScrollBarThickness = 5
    BindThemeProperty(list, "ScrollBarImageColor3", "OutlineColor")
    list.CanvasSize = UDim2.new()
    list.ScrollingDirection = Enum.ScrollingDirection.Y
    list.ZIndex = 9002
    list.Parent = card
    pcall(function() list.AutomaticCanvasSize = Enum.AutomaticCanvasSize.Y end)
    local listCorner = Instance.new("UICorner")
    listCorner.CornerRadius = UDim.new(0, 8)
    listCorner.Parent = list
    local layout = Instance.new("UIListLayout")
    layout.Padding = UDim.new(0, 4)
    layout.SortOrder = Enum.SortOrder.LayoutOrder
    layout.Parent = list
    local listPadding = Instance.new("UIPadding")
    listPadding.PaddingLeft = UDim.new(0, 8)
    listPadding.PaddingRight = UDim.new(0, 8)
    listPadding.PaddingTop = UDim.new(0, 8)
    listPadding.PaddingBottom = UDim.new(0, 8)
    listPadding.Parent = list
    layout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
        list.CanvasSize = UDim2.new(0, 0, 0, layout.AbsoluteContentSize.Y + 16)
    end)

    local active
    local rows = {}
    local painters = {}
    local function clearRows()
        for _, row in pairs(rows) do row:Destroy() end
        table.clear(rows)
        table.clear(painters)
        list.CanvasPosition = Vector2.zero
    end

    local function makeRow(name)
        local context = active
        local row = Instance.new("TextButton")
        row.Size = UDim2.new(1, 0, 0, 40)
        row.AutoButtonColor = false
        row.Text = ""
        row.ZIndex = 9003
        row.Parent = list
        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 6)
        corner.Parent = row
        local stroke = Instance.new("UIStroke")
        stroke.Transparency = 0.65
        stroke.Thickness = 1
        stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
        stroke.Parent = row
        local label = Instance.new("TextLabel")
        label.BackgroundTransparency = 1
        label.Position = UDim2.fromOffset(14, 0)
        label.Size = UDim2.new(1, -22, 1, 0)
        label.RichText = true
        label.Text = (context.DisplayMap and context.DisplayMap[name]) or name
        label.FontFace = Library.Scheme.Font
        label.TextSize = 15
        BindThemeProperty(label, "TextColor3", "FontColor")
        label.TextXAlignment = Enum.TextXAlignment.Left
        label.ZIndex = 9004
        label.Parent = row

        local hovering = false
        local function paint()
            local selected = context.Store[name] == true
            BindThemeProperty(row, "BackgroundColor3", function()
                return Library:GetBetterColor(Library.Scheme.MainColor, selected and 18 or (hovering and 9 or 0))
            end)
            BindThemeProperty(stroke, "Color", (selected or hovering) and "AccentColor" or "OutlineColor")
            stroke.Transparency = selected and 0.05 or (hovering and 0.4 or 0.65)
            stroke.Thickness = selected and 1.4 or 1
        end
        row.MouseEnter:Connect(function() hovering = true; paint() end)
        row.MouseLeave:Connect(function() hovering = false; paint() end)
        row.MouseButton1Click:Connect(function()
            if active ~= context then return end
            if context.Single then
                for key in pairs(context.Store) do context.Store[key] = nil end
                context.Store[name] = true
                for _, painter in pairs(painters) do painter() end
                if context.OnToggle then pcall(context.OnToggle, name, true) end
            else
                context.Store[name] = not context.Store[name]
                paint()
                if context.OnToggle then pcall(context.OnToggle, name, context.Store[name]) end
            end
        end)
        rows[name] = row
        painters[name] = paint
        paint()
    end

    local function rebuild()
        clearRows()
        if not active then return end
        for _, name in ipairs(active.Items) do makeRow(name) end
    end

    local function close()
        if not active then root.Visible = false return end
        local closing = active
        active = nil
        root.Visible = false
        clearRows()
        if closing.OnDone then pcall(closing.OnDone) end
    end
    doneButton.MouseButton1Click:Connect(close)
    rootBtn.MouseButton1Click:Connect(close)

    noneButton.MouseButton1Click:Connect(function()
        if not active or active.Single then return end
        for _, name in ipairs(active.Items) do active.Store[name] = false end
        for _, painter in pairs(painters) do painter() end
        if active.OnToggle then pcall(active.OnToggle) end
    end)
    allButton.MouseButton1Click:Connect(function()
        if not active or active.Single then return end
        for _, name in ipairs(active.Items) do active.Store[name] = true end
        for _, painter in pairs(painters) do painter() end
        if active.OnToggle then pcall(active.OnToggle) end
    end)
    search:GetPropertyChangedSignal("Text"):Connect(function()
        local query = string.lower(search.Text)
        for name, row in pairs(rows) do
            row.Visible = query == "" or string.find(string.lower(name), query, 1, true) ~= nil
        end
    end)

    SharedTargetOverlay = {
        Open = function(_, context)
            if active and active ~= context and active.OnDone then pcall(active.OnDone) end
            active = context
            titleLabel.Text = "🎯 " .. tostring(context.Title)
            noneButton.Visible = not context.Single
            allButton.Visible = not context.Single
            search.Text = ""
            rebuild()
            root.Visible = true
        end,
        Close = close,
        Rebuild = function(_, context)
            if active == context then rebuild() end
        end,
        Repaint = function(_, context)
            if active == context then
                for _, painter in pairs(painters) do painter() end
            end
        end,
        Root = root,
    }
    return SharedTargetOverlay
end

MakeTargetOverlay = function(cfg)
    local context = {
        Title = cfg.Title or "Select",
        Items = cfg.Items or {},
        Store = cfg.Store or {},
        DisplayMap = cfg.DisplayMap,
        OnDone = cfg.OnDone,
        OnToggle = cfg.OnToggle,
        Single = cfg.Single == true,
    }
    return {
        Open = function() getSharedTargetOverlay():Open(context) end,
        SetItems = function(items, displayMap)
            context.Items = items or {}
            if displayMap ~= nil then context.DisplayMap = displayMap end
            getSharedTargetOverlay():Rebuild(context)
        end,
        Repaint = function() getSharedTargetOverlay():Repaint(context) end,
    }
end
end

local function BindDropdownOverlay(groupbox, dropdownIdx, title, items, opts)
    opts = opts or {}
    local multi = opts.multi

    local store = opts.store
    if not multi then
        store = {}
        local cur = opts.get and opts.get()
        if cur and table.find(items, cur) then store[cur] = true end
    end

    local function summary()
        if multi then
            local picked = {}
            for _, n in ipairs(items) do if store[n] then picked[#picked + 1] = n end end
            if #picked == 0 then return "---" end
            if #picked == #items then return "All" end

            if #picked == 1 then return picked[1] end
            return #picked .. " selected"
        else
            for _, n in ipairs(items) do if store[n] then return n end end
            return "---"
        end
    end

    local dd = groupbox:AddDropdown(dropdownIdx, {
        Text    = opts.text,
        Values  = { "---", "All" },
        Default = "---",
        Tooltip = opts.tooltip or ("Open " .. title .. "."),
    })

    local arrowRef
    local function styleValueText()
        local holder = dd.Holder
        if not holder then return end
        local val = summary()
        for _, e in ipairs(holder:GetDescendants()) do
            if (e:IsA("TextLabel") or e:IsA("TextButton")) and e.Name ~= "CloverHubOverlayCatcher" then
                pcall(function()
                    e.TextXAlignment = Enum.TextXAlignment.Left
                    e.TextYAlignment = Enum.TextYAlignment.Center
                    if not e.TextScaled and e.TextSize < 15 then e.TextSize = 15 end
                    if e.Text == val then
                        if e.Parent and e.Parent:IsA("GuiObject") then

                            e.Size = UDim2.new(1, -34, 1, 0)
                            e.ClipsDescendants = true
                        end
                        local p = e:FindFirstChildOfClass("UIPadding")
                        if not p then p = Instance.new("UIPadding"); p.Parent = e end
                        p.PaddingLeft = UDim.new(0, 2)
                        p.PaddingRight = UDim.new(0, 4)
                        p.PaddingBottom = UDim.new(0, 3)
                    end
                end)
            end
        end
    end
    local function refreshLabel()
        local s = summary()
        pcall(function() dd:SetValues({ s }); dd:SetValue(s) end)
        styleValueText()
    end
    local function setArrowOpen(open)
        if not arrowRef then return end
        pcall(function()
            TweenService:Create(arrowRef, TweenInfo.new(0.15, Enum.EasingStyle.Quad),
                { Rotation = open and 180 or 0 }):Play()
        end)
    end

    local overlay = MakeTargetOverlay({
        Title  = title,
        Items  = items,
        Store  = store,
        Single = not multi,
        DisplayMap = opts.displayMap,
        OnDone = function() setArrowOpen(false) end,
        OnToggle = function(name)
            if not multi and name then
                if opts.set then opts.set(name) end
            end
            refreshLabel()
            if opts.onChange then pcall(opts.onChange) end
        end,
    })

    refreshLabel()

    local controller = {
        Dropdown = dd,
        Overlay  = overlay,
        Multi    = multi,
        GetValue = function()
            if multi then
                local out = {}
                for n in pairs(store) do if store[n] then out[n] = true end end
                return out
            else
                for _, n in ipairs(items) do if store[n] then return n end end
                return "Any"
            end
        end,
        SetValue = function(_, v)
            for k in pairs(store) do store[k] = nil end
            local selectedValue
            if multi then
                if type(v) == "table" then
                    for key, on in pairs(v) do
                        if on == true then
                            store[key] = true
                        elseif type(key) == "number" and type(on) == "string" then
                            store[on] = true
                        end
                    end
                end
            else
                if type(opts.configValueToItem) == "function" then
                    local ok, mapped = pcall(opts.configValueToItem, v)
                    if ok then v = mapped end
                end
                if type(v) == "string" and v ~= "" and table.find(items, v) then
                    store[v] = true
                    selectedValue = v
                end
                if opts.set then pcall(opts.set, selectedValue) end
            end
            refreshLabel()
            pcall(function() overlay.Repaint() end)
        end,
        SetItems = function(_, newItems, preserveValue)
            if type(newItems) ~= "table" then return end
            local previous
            if not multi then
                for _, name in ipairs(items) do
                    if store[name] then previous = name; break end
                end
            end
            items = newItems
            for name in pairs(store) do
                if not table.find(items, name) then store[name] = nil end
            end
            if not multi and preserveValue and previous and table.find(items, previous) then
                store[previous] = true
                if opts.set then pcall(opts.set, previous) end
            elseif not multi and opts.set then
                pcall(opts.set, nil)
            end
            pcall(function() overlay.SetItems(items, opts.displayMap) end)
            refreshLabel()
        end,
    }
    if type(opts.configKey) == "string" then
        local registry = context.ConfigControllers
        if type(registry) == "table" then registry[opts.configKey] = controller end
    end

    task.defer(function()
        local holder = dd.Holder
        if not holder then return end
        local displayBtn = holder:FindFirstChildWhichIsA("TextButton", true)
        local anchorTo = displayBtn or holder

        local cover = Instance.new("TextButton")
        cover.Name = "CloverHubOverlayCatcher"
        cover.BackgroundTransparency = 1
        cover.Text = ""
        cover.Size = UDim2.fromScale(1, 1)
        cover.Position = UDim2.fromScale(0, 0)
        cover.ZIndex = (anchorTo.ZIndex or 1) + 50
        cover.Active = true
        cover.AutoButtonColor = false
        cover.Parent = anchorTo

        refreshLabel()

        arrowRef = holder:FindFirstChildWhichIsA("ImageLabel", true)
                or holder:FindFirstChildWhichIsA("ImageButton", true)

        local conn = cover.MouseButton1Click:Connect(function()
            pcall(function() if dd.Menu and dd.Menu.Close then dd.Menu:Close() end end)
            if opts.onOpen then pcall(opts.onOpen) end
            setArrowOpen(true)
            overlay.Open()
        end)
        Library:GiveSignal(conn)
    end)

    return controller
end

local function MakeButtonPanel(groupbox, panelId, buttons)

    local BTN_H  = 30
    local GAP    = 4
    local totalH = (#buttons * BTN_H) + ((#buttons - 1) * GAP)

    local panel = Instance.new("Frame")
    panel.BackgroundTransparency = 1
    panel.BorderSizePixel  = 0
    panel.Size             = UDim2.new(1, 0, 0, totalH)

    local layout = Instance.new("UIListLayout")
    layout.FillDirection       = Enum.FillDirection.Vertical
    layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
    layout.SortOrder           = Enum.SortOrder.LayoutOrder
    layout.Padding             = UDim.new(0, GAP)
    layout.Parent              = panel

    for i, def in ipairs(buttons) do
        local btn = Instance.new("TextButton")
        btn.Text             = def[1]
        btn.Font             = Enum.Font.GothamSemibold
        btn.TextSize         = 13
        BindThemeProperty(btn, "TextColor3", "FontColor")
        BindThemeProperty(btn, "BackgroundColor3", CardThemeColor)
        btn.BorderSizePixel  = 0
        btn.Size             = UDim2.new(1, 0, 0, BTN_H)
        btn.LayoutOrder      = i
        btn.AutoButtonColor  = false

        local c = Instance.new("UICorner")
        c.CornerRadius = UDim.new(0, 6)
        c.Parent = btn

        local stroke = Instance.new("UIStroke")
        BindThemeProperty(stroke, "Color", "OutlineColor")
        stroke.Thickness       = 1
        stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
        stroke.Parent          = btn

        btn.MouseEnter:Connect(function()
            BindThemeProperty(btn, "BackgroundColor3", function() return Library:GetBetterColor(Library.Scheme.MainColor, 8.5) end)
        end)
        btn.MouseLeave:Connect(function()
            BindThemeProperty(btn, "BackgroundColor3", CardThemeColor)
        end)
        btn.MouseButton1Click:Connect(def[2])
        btn.Parent = panel
    end

    groupbox:AddUIPassthrough(panelId, {
        Instance = panel,
        Height   = totalH,
    })

    return panel
end

local CHK = {}

function CHK.DeferTabBuild(tab, build, cleanup)
    if tab.__DeferredBuild then return tab.__DeferredBuild end
    local state = { phase = "waiting", attempts = 0 }
    tab.__DeferredBuild = state
    local canvas = tab.Canvas
    local connections = {}
    local function disconnect()
        for _, connection in ipairs(connections) do connection:Disconnect() end
        table.clear(connections)
    end
    local function alive()
        return sessionAlive() and not tab.Destroyed
            and (not canvas or canvas.Parent ~= nil)
    end
    local function visible()
        return not canvas or canvas.Visible
    end
    local function requestBuild()
        if state.phase ~= "waiting" and state.phase ~= "failed" then return end
        if not alive() then state.phase = "cancelled"; disconnect(); return end
        if not visible() then return end
        state.phase = "queued"
        task.defer(function()
            if not alive() then state.phase = "cancelled"; disconnect(); return end
            if not visible() then state.phase = "waiting"; return end
            state.phase = "building"
            state.attempts += 1

            local originalIdentity
            if type(getthreadidentity) == "function" and type(setthreadidentity) == "function" then
                local ok, identity = pcall(getthreadidentity)
                if ok and type(identity) == "number" then
                    originalIdentity = identity
                    pcall(setthreadidentity, 8)
                end
            end
            local ok, message = pcall(build, alive)
            if not alive() then ok, message = false, "session ended during construction" end
            if ok then
                state.phase = "ready"
                disconnect()
            else
                if cleanup then pcall(cleanup) end
                state.phase = alive() and "failed" or "cancelled"
                if state.phase == "cancelled" then
                    disconnect()
                else
                    warn("[CloverHub] Deferred " .. tostring(tab.Name) .. " UI: " .. tostring(message))
                    pcall(function()
                        Library:Notify("Could not build " .. tostring(tab.Name) .. ". Reopen the tab to retry.", 5)
                    end)
                end
            end
            if originalIdentity ~= nil then pcall(setthreadidentity, originalIdentity) end
        end)
    end
    if canvas then
        connections[#connections + 1] = canvas:GetPropertyChangedSignal("Visible"):Connect(requestBuild)
        connections[#connections + 1] = canvas.Destroying:Connect(function()
            state.phase = "cancelled"
            disconnect()
        end)
        for _, connection in ipairs(connections) do
            tab.Connections[#tab.Connections + 1] = connection
            local runtimeConns = context.Connections
            if type(runtimeConns) == "table" then runtimeConns[#runtimeConns + 1] = connection end
        end
    end

    requestBuild()
    return state
end

CHK.mergeSets = {}
function CHK.Merge(groupbox, buildFn)
    local container = groupbox.Container
    local before = {}
    for _, child in ipairs(container:GetChildren()) do
        before[child] = true
    end

    buildFn()

    local set = {}
    for _, child in ipairs(container:GetChildren()) do
        if child:IsA("GuiObject") and not before[child] then
            set[#set + 1] = child
        end
    end
    if #set == 0 then return nil end

    local card = Instance.new("Frame")
    card.Name = "CloverStatusCard"
    card:SetAttribute("CloverHubStatusCard", true)
    card.AutomaticSize = Enum.AutomaticSize.Y
    BindThemeProperty(card, "BackgroundColor3", CardThemeColor)
    card.BorderSizePixel = 0
    card.LayoutOrder = -1000
    card.Size = UDim2.new(1, 0, 0, 0)
    card.ZIndex = 2

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = card
    local stroke = Instance.new("UIStroke")
    BindThemeProperty(stroke, "Color", "OutlineColor")
    stroke.Thickness = 1
    stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    stroke.Parent = card
    local layout = Instance.new("UIListLayout")
    layout.Padding = UDim.new(0, 4)
    layout.SortOrder = Enum.SortOrder.LayoutOrder
    layout.Parent = card
    local padding = Instance.new("UIPadding")
    padding.PaddingBottom = UDim.new(0, 3)
    padding.PaddingLeft = UDim.new(0, 10)
    padding.PaddingRight = UDim.new(0, 10)
    padding.PaddingTop = UDim.new(0, 3)
    padding.Parent = card

    for index, member in ipairs(set) do
        member.LayoutOrder = index
        member.Parent = card
        member.ZIndex = math.max(member.ZIndex, card.ZIndex + 1)
        if member:IsA("TextLabel") then
            member.AutomaticSize = Enum.AutomaticSize.Y
            member.Size = UDim2.new(1, 0, 0, math.max(18, member.Size.Y.Offset))
            member.TextTruncate = Enum.TextTruncate.None
            member.TextWrapped = true
        end
    end

    card.Parent = container

    layout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
        if card.Parent and groupbox.Resize then pcall(function() groupbox:Resize() end) end
    end)
    task.defer(function()

        for _ = 1, 3 do task.wait() end
        if card.Parent and groupbox.Resize then pcall(function() groupbox:Resize() end) end
    end)
    return card
end

function CHK.Slider(groupbox, id, info)
    local minimum = tonumber(info.Min) or 0
    local maximum = math.max(minimum + 1, tonumber(info.Max) or 100)
    local rounding = math.max(0, math.floor(tonumber(info.Rounding) or 0))
    local suffix = tostring(info.Suffix or "")
    local value = math.clamp(tonumber(info.Default) or minimum, minimum, maximum)
    local callback
    local inputService = game:GetService("UserInputService")

    local card = Instance.new("Frame")
    card.Name = "CloverSlider_" .. tostring(id)
    BindThemeProperty(card, "BackgroundColor3", CardThemeColor)
    card.BorderSizePixel = 0
    card.Size = UDim2.new(1, 0, 0, 54)
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6); corner.Parent = card
    local stroke = Instance.new("UIStroke")
    BindThemeProperty(stroke, "Color", "OutlineColor"); stroke.Thickness = 1
    stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border; stroke.Parent = card

    local title = Instance.new("TextLabel")
    title.BackgroundTransparency = 1
    title.Position = UDim2.fromOffset(10, 5)
    title.Size = UDim2.new(0.55, -10, 0, 22)
    title.FontFace = Library.Scheme.Font
    title.Text = tostring(info.Text or id)
    title.TextSize = 13
    BindThemeProperty(title, "TextColor3", "FontColor")
    title.TextXAlignment = Enum.TextXAlignment.Left
    title.Parent = card

    local valueLabel = Instance.new("TextLabel")
    valueLabel.BackgroundTransparency = 1
    valueLabel.AnchorPoint = Vector2.new(1, 0)
    valueLabel.Position = UDim2.new(1, -10, 0, 5)
    valueLabel.Size = UDim2.new(0.45, 0, 0, 22)
    valueLabel.FontFace = Library.Scheme.Font
    valueLabel.TextSize = 13
    BindThemeProperty(valueLabel, "TextColor3", "AccentColor")
    valueLabel.TextXAlignment = Enum.TextXAlignment.Right
    valueLabel.Parent = card

    local track = Instance.new("Frame")
    track.Name = "Track"
    track.Position = UDim2.new(0, 10, 0, 35)
    track.Size = UDim2.new(1, -20, 0, 6)
    BindThemeProperty(track, "BackgroundColor3", function() return Library:GetBetterColor(Library.Scheme.MainColor, 18) end)
    track.BorderSizePixel = 0
    track.Parent = card
    local trackCorner = Instance.new("UICorner")
    trackCorner.CornerRadius = UDim.new(1, 0); trackCorner.Parent = track

    local fill = Instance.new("Frame")
    fill.Name = "Fill"
    BindThemeProperty(fill, "BackgroundColor3", "AccentColor")
    fill.BorderSizePixel = 0
    fill.Size = UDim2.fromScale(0, 1)
    fill.Parent = track
    local fillCorner = Instance.new("UICorner")
    fillCorner.CornerRadius = UDim.new(1, 0); fillCorner.Parent = fill

    local knob = Instance.new("Frame")
    knob.Name = "Knob"
    knob.AnchorPoint = Vector2.new(0.5, 0.5)
    knob.Position = UDim2.fromScale(0, 0.5)
    knob.Size = UDim2.fromOffset(14, 14)
    BindThemeProperty(knob, "BackgroundColor3", "FontColor")
    knob.BorderSizePixel = 0
    knob.ZIndex = track.ZIndex + 2
    knob.Parent = track
    local knobCorner = Instance.new("UICorner")
    knobCorner.CornerRadius = UDim.new(1, 0); knobCorner.Parent = knob
    local knobStroke = Instance.new("UIStroke")
    BindThemeProperty(knobStroke, "Color", "AccentColor"); knobStroke.Thickness = 2; knobStroke.Parent = knob

    local hit = Instance.new("TextButton")
    hit.Name = "DragTarget"
    hit.BackgroundTransparency = 1
    hit.Text = ""
    hit.Position = UDim2.new(0, 4, 0, 27)
    hit.Size = UDim2.new(1, -8, 0, 24)
    hit.ZIndex = knob.ZIndex + 1
    hit.Parent = card

    local function render(fire)
        local factor = 10 ^ rounding
        value = math.floor(math.clamp(value, minimum, maximum) * factor + 0.5) / factor
        local ratio = (value - minimum) / (maximum - minimum)
        fill.Size = UDim2.fromScale(ratio, 1)
        knob.Position = UDim2.fromScale(ratio, 0.5)
        valueLabel.Text = (rounding == 0 and tostring(math.floor(value))
            or string.format("%." .. rounding .. "f", value)) .. suffix
        if fire and callback then pcall(callback, value) end
    end
    local function setFromX(x)
        if track.AbsoluteSize.X <= 0 then return end
        local ratio = math.clamp((x - track.AbsolutePosition.X) / track.AbsoluteSize.X, 0, 1)
        value = minimum + (maximum - minimum) * ratio
        render(true)
    end

    local dragging, touchInput = false, nil
    Library:GiveSignal(hit.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1
            or input.UserInputType == Enum.UserInputType.Touch then
            dragging, touchInput = true, input.UserInputType == Enum.UserInputType.Touch and input or nil
            setFromX(input.Position.X)
        end
    end))
    Library:GiveSignal(inputService.InputChanged:Connect(function(input)
        if not dragging then return end
        if input.UserInputType == Enum.UserInputType.MouseMovement then
            setFromX(inputService:GetMouseLocation().X)
        elseif touchInput and input == touchInput then
            setFromX(input.Position.X)
        end
    end))
    Library:GiveSignal(inputService.InputEnded:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input == touchInput then
            dragging, touchInput = false, nil
        end
    end))

    groupbox:AddUIPassthrough(id, { Instance = card, Height = 54 })
    render(false)
    task.defer(function() render(false) end)
    return {
        OnChanged = function(_, fn) callback = fn; return fn end,

        SetValue = function(_, newValue, silent)
            value = tonumber(newValue) or value
            render(silent ~= true)
        end,
        GetValue = function() return value end,
        Holder = card,
    }
end

function CHK.SetMetricValue(values, rawValues, colors, key, newValue, color)
    key = tostring(key)
    local label = values[key]
    if not label then return false end
    local display = tostring(newValue or "--")
    local textChanged = rawValues[key] ~= display
    local colorChanged = color ~= nil and colors[key] ~= color
    if not textChanged and not colorChanged then return true end

    local originalIdentity
    if type(getthreadidentity) == "function" and type(setthreadidentity) == "function" then
        local ok, identity = pcall(getthreadidentity)
        if ok and type(identity) == "number" then
            originalIdentity = identity
            pcall(setthreadidentity, 8)
        end
    end
    local ok, message = pcall(function()
        if textChanged then
            label.Text = "<b>" .. display .. "</b>"
            rawValues[key] = display
        end
        if colorChanged then
            label.TextColor3 = color
            colors[key] = color
        end
    end)
    if originalIdentity ~= nil then pcall(setthreadidentity, originalIdentity) end
    return ok, message
end

function CHK.BindMetricView(panel, values)
    local desired, desiredColors, rendered, renderedColors, dirty = {}, {}, {}, {}, {}
    local ancestors, visibilityConnections, lifetimeConnections = {}, {}, {}
    local queued, stopped, rebind, visible = false, false, true, nil
    local view = { Holder = panel }
    local function disconnectAll(connections)
        for _, connection in ipairs(connections) do connection:Disconnect() end
        table.clear(connections)
    end
    function view:Disconnect()
        if stopped then return end
        stopped = true
        disconnectAll(visibilityConnections)
        disconnectAll(lifetimeConnections)
        table.clear(ancestors)
    end
    local requestFlush
    local function refresh()
        if rebind then
            disconnectAll(visibilityConnections)
            table.clear(ancestors)
            local node = panel
            while node do
                local property = node:IsA("GuiObject") and "Visible"
                    or (node:IsA("LayerCollector") and "Enabled" or nil)
                if property then
                    ancestors[#ancestors + 1] = { node = node, property = property }
                    visibilityConnections[#visibilityConnections + 1] =
                        node:GetPropertyChangedSignal(property):Connect(function()
                            visible = nil
                            requestFlush()
                        end)
                end
                node = node.Parent
            end
            rebind = false
        end
        local attached = false
        visible = true
        for _, ancestor in ipairs(ancestors) do
            if ancestor.property == "Enabled" and ancestor.node.Parent ~= nil then attached = true end
            if not ancestor.node[ancestor.property] then visible = false end
        end
        visible = visible and attached
        if not visible then return end
        for key in pairs(dirty) do
            if CHK.SetMetricValue(values, rendered, renderedColors, key, desired[key], desiredColors[key]) then
                dirty[key] = nil
            end
        end
    end
    requestFlush = function()
        if stopped or queued then return end
        queued = true
        task.defer(function()
            queued = false
            if stopped then return end
            if not sessionAlive() then view:Disconnect(); return end

            local originalIdentity
            if type(getthreadidentity) == "function" and type(setthreadidentity) == "function" then
                local ok, identity = pcall(getthreadidentity)
                if ok and type(identity) == "number" then
                    originalIdentity = identity
                    pcall(setthreadidentity, 8)
                end
            end
            local ok = pcall(refresh)
            if not ok then visible = nil end
            if originalIdentity ~= nil then pcall(setthreadidentity, originalIdentity) end
        end)
    end
    function view:Set(key, newValue, color)
        key = tostring(key)
        if stopped or not values[key] then return false end
        local display = tostring(newValue or "--")
        if desired[key] ~= display or (color ~= nil and desiredColors[key] ~= color) then
            desired[key] = display
            if color ~= nil then desiredColors[key] = color end
            dirty[key] = true
        end
        if dirty[key] and visible ~= false then requestFlush() end
        return true
    end
    function view:Get(key) return desired[tostring(key)] or "--" end
    lifetimeConnections[#lifetimeConnections + 1] = panel.AncestryChanged:Connect(function()
        rebind, visible = true, nil
        requestFlush()
    end)
    lifetimeConnections[#lifetimeConnections + 1] = panel.Destroying:Connect(function() view:Disconnect() end)

    local runtimeConns = context.Connections or {}
    context.Connections = runtimeConns
    runtimeConns[#runtimeConns + 1] = view
    requestFlush()
    return view
end

function CHK.Metrics(groupbox, id, definitions, columns)
    columns = math.max(1, math.floor(tonumber(columns) or 2))
    local gap, cellHeight = 4, 42
    local rows = math.max(1, math.ceil(#definitions / columns))
    local totalHeight = rows * cellHeight + (rows - 1) * gap
    local values = {}

    local panel = Instance.new("Frame")
    panel.Name = "CloverMetrics_" .. tostring(id)
    panel.BackgroundTransparency = 1
    panel.BorderSizePixel = 0
    panel.Size = UDim2.new(1, 0, 0, totalHeight)

    local layout = Instance.new("UIGridLayout")
    layout.SortOrder = Enum.SortOrder.LayoutOrder
    layout.CellPadding = UDim2.fromOffset(gap, gap)
    layout.CellSize = UDim2.new(1 / columns,
        columns == 1 and 0 or -math.ceil(gap * (columns - 1) / columns), 0, cellHeight)
    layout.Parent = panel

    for index, definition in ipairs(definitions) do
        local key = tostring(definition.key or index)
        local accent = definition.color or Library.Scheme.AccentColor
        local card = Instance.new("Frame")
        card.Name = "Metric_" .. key
        card.LayoutOrder = index
        BindThemeProperty(card, "BackgroundColor3", CardThemeColor)
        card.BorderSizePixel = 0
        card.Parent = panel
        local corner = Instance.new("UICorner")
        corner.CornerRadius = UDim.new(0, 6); corner.Parent = card
        local stroke = Instance.new("UIStroke")
        BindThemeProperty(stroke, "Color", "OutlineColor")
        stroke.Thickness = 1
        stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
        stroke.Parent = card

        local strip = Instance.new("Frame")
        strip.Name = "Accent"
        strip.Position = UDim2.fromOffset(0, 8)
        strip.Size = UDim2.new(0, 3, 1, -16)
        strip.BackgroundColor3 = accent
        strip.BorderSizePixel = 0
        strip.Parent = card
        local stripCorner = Instance.new("UICorner")
        stripCorner.CornerRadius = UDim.new(1, 0); stripCorner.Parent = strip

        local icon = Instance.new("TextLabel")
        icon.BackgroundTransparency = 1
        icon.Position = UDim2.fromOffset(8, 5)
        icon.Size = UDim2.fromOffset(19, 32)
        icon.FontFace = Library.Scheme.Font
        icon.Text = tostring(definition.icon or "•")
        icon.TextSize = 13
        icon.TextColor3 = accent
        icon.Parent = card

        local title = Instance.new("TextLabel")
        title.BackgroundTransparency = 1
        title.Position = UDim2.fromOffset(29, 4)
        title.Size = UDim2.new(1, -35, 0, 15)
        title.FontFace = Library.Scheme.Font
        title.Text = tostring(definition.title or key)
        title.TextSize = 10
        title.TextColor3 = Color3.fromRGB(155, 158, 168)
        title.TextXAlignment = Enum.TextXAlignment.Left
        title.Parent = card

        local value = Instance.new("TextLabel")
        value.BackgroundTransparency = 1
        value.Position = UDim2.fromOffset(29, 18)
        value.Size = UDim2.new(1, -35, 0, 19)
        value.FontFace = Library.Scheme.Font
        value.RichText = true
        value.Text = "<b>--</b>"
        value.TextSize = 12
        BindThemeProperty(value, "TextColor3", function() return definition.valueColor or Library.Scheme.FontColor end)
        value.TextXAlignment = Enum.TextXAlignment.Left
        value.TextTruncate = Enum.TextTruncate.AtEnd
        value.Parent = card
        values[key] = value
    end

    groupbox:AddUIPassthrough(id, { Instance = panel, Height = totalHeight })
    return CHK.BindMetricView(panel, values)
end

function CHK.Notice(groupbox, id, info)
    info = info or {}
    local height = math.max(68, tonumber(info.height) or 78)
    local accent = info.accent or Library.Scheme.AccentColor
    local z = tonumber(info.zIndex) or 2

    local panel = Instance.new("Frame")
    panel.Name = "CloverNotice_" .. tostring(id)
    panel.BackgroundTransparency = 1
    panel.BorderSizePixel = 0
    panel.Size = UDim2.new(1, 0, 0, height)
    panel.ZIndex = z

    local card = Instance.new("Frame")
    card.Name = "NoticeCard"
    BindThemeProperty(card, "BackgroundColor3", CardThemeColor)
    card.BorderSizePixel = 0
    card.Size = UDim2.fromScale(1, 1)
    card.ZIndex = z
    card.Parent = panel
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = card
    local stroke = Instance.new("UIStroke")
    BindThemeProperty(stroke, "Color", "OutlineColor")
    stroke.Thickness = 1
    stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    stroke.Parent = card

    local strip = Instance.new("Frame")
    strip.Name = "Accent"
    strip.Position = UDim2.fromOffset(0, 9)
    strip.Size = UDim2.new(0, 3, 1, -18)
    strip.BackgroundColor3 = accent
    strip.BorderSizePixel = 0
    strip.ZIndex = z + 1
    strip.Parent = card
    local stripCorner = Instance.new("UICorner")
    stripCorner.CornerRadius = UDim.new(1, 0)
    stripCorner.Parent = strip

    local title = Instance.new("TextLabel")
    title.Name = "NoticeTitle"
    title.BackgroundTransparency = 1
    title.Position = UDim2.fromOffset(14, 7)
    title.Size = UDim2.new(1, -24, 0, 22)
    title.FontFace = Library.Scheme.Font
    title.RichText = true
    title.Text = "<b>" .. tostring(info.title or "NOTICE") .. "</b>"
    title.TextSize = tonumber(info.titleSize) or 16
    title.TextColor3 = info.titleColor or accent
    title.TextXAlignment = Enum.TextXAlignment.Left
    title.TextYAlignment = Enum.TextYAlignment.Center
    title.ZIndex = z + 1
    title.Parent = card

    local body = Instance.new("TextLabel")
    body.Name = "NoticeBody"
    body.BackgroundTransparency = 1
    body.Position = UDim2.fromOffset(14, 30)
    body.Size = UDim2.new(1, -24, 1, -36)
    body.FontFace = Library.Scheme.Font
    body.RichText = true
    body.Text = tostring(info.text or "")
    body.TextSize = tonumber(info.textSize) or 14
    BindThemeProperty(body, "TextColor3", function() return info.textColor or Library.Scheme.FontColor end)
    body.TextWrapped = true
    body.TextXAlignment = Enum.TextXAlignment.Left
    body.TextYAlignment = Enum.TextYAlignment.Top
    body.ZIndex = z + 1
    body.Parent = card

    groupbox:AddUIPassthrough(id, { Instance = panel, Height = height })
    return { Holder = panel, Card = card, Title = title, Body = body }
end

function CHK.SalePreview(groupbox, id, info)
    info = info or {}
    local height = math.max(42, tonumber(info.height) or 46)
    local z = tonumber(info.zIndex) or 9003
    local accent = info.accent or Color3.fromRGB(248, 113, 113)

    local panel = Instance.new("Frame")
    panel.Name = "CloverSalePreview_" .. tostring(id)
    panel.BackgroundTransparency = 1
    panel.BorderSizePixel = 0
    panel.Size = UDim2.new(1, 0, 0, height)
    panel.ZIndex = z

    local summaryCard = Instance.new("Frame")
    summaryCard.Name = "SummaryCard"
    BindThemeProperty(summaryCard, "BackgroundColor3", CardThemeColor)
    summaryCard.BorderSizePixel = 0
    summaryCard.Size = UDim2.fromScale(1, 1)
    summaryCard.ZIndex = z
    summaryCard.Parent = panel
    local summaryCorner = Instance.new("UICorner")
    summaryCorner.CornerRadius = UDim.new(0, 6)
    summaryCorner.Parent = summaryCard
    local summaryStroke = Instance.new("UIStroke")
    BindThemeProperty(summaryStroke, "Color", "OutlineColor")
    summaryStroke.Thickness = 1
    summaryStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
    summaryStroke.Parent = summaryCard

    local summaryStrip = Instance.new("Frame")
    summaryStrip.Position = UDim2.fromOffset(0, 7)
    summaryStrip.Size = UDim2.new(0, 3, 1, -14)
    summaryStrip.BackgroundColor3 = accent
    summaryStrip.BorderSizePixel = 0
    summaryStrip.ZIndex = z + 1
    summaryStrip.Parent = summaryCard
    local stripCorner = Instance.new("UICorner")
    stripCorner.CornerRadius = UDim.new(1, 0)
    stripCorner.Parent = summaryStrip

    local summaryTitle = Instance.new("TextLabel")
    summaryTitle.BackgroundTransparency = 1
    summaryTitle.Position = UDim2.fromOffset(14, 0)
    summaryTitle.Size = UDim2.new(1, -24, 1, 0)
    summaryTitle.FontFace = Library.Scheme.Font
    summaryTitle.Text = "0 pets selected"
    summaryTitle.TextSize = 14
    BindThemeProperty(summaryTitle, "TextColor3", "FontColor")
    summaryTitle.TextXAlignment = Enum.TextXAlignment.Left
    summaryTitle.TextYAlignment = Enum.TextYAlignment.Center
    summaryTitle.ZIndex = z + 1
    summaryTitle.Parent = summaryCard

    local function render(snapshot)
        snapshot = type(snapshot) == "table" and snapshot or {}
        summaryTitle.Text = tostring(snapshot.Summary or "0 items selected")
    end

    groupbox:AddUIPassthrough(id, { Instance = panel, Height = height })
    render(info.snapshot)
    return {
        Holder = panel,
        SetSnapshot = function(_, snapshot) render(snapshot) end,
    }
end

local _notificationQueue = {}
local originalNotify = Library.Notify
local notificationWorkerRunning = false

local function SafeNotify(msg, duration)
    table.insert(_notificationQueue, { msg = tostring(msg), duration = duration or 5 })
    if notificationWorkerRunning then return end
    notificationWorkerRunning = true
    task.spawn(function()
        while sessionAlive() and #_notificationQueue > 0 do
            local item = table.remove(_notificationQueue, 1)
            pcall(function()
                originalNotify(Library, item.msg, item.duration)
            end)

            RunService.Heartbeat:Wait()
        end
        notificationWorkerRunning = false
    end)
end

Library.Notify = function(self, msg, duration)
    SafeNotify(msg, duration)
end

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
do
    if type(Library.AddDraggableButton) == "function" then
        Window.__VisibilityButton = Library:AddDraggableButton(
            "Clover",
            function() end,
            true,
            false
        )

        local visibilityControl = Window.__VisibilityButton
        local visibilityButton = visibilityControl and visibilityControl.Button
        if visibilityButton then
            local inputService = game:GetService("UserInputService")
            local pressButtonPosition
            local pressVisualInput
            local dragTolerance = Library.IsMobile and 14 or 8
            local visibilityRequestId = 0
            local visibilityRetryDelay = math.max(
                0.08,
                (Library.WindowAnimationInfo and Library.WindowAnimationInfo.Time or 0.2) + 0.04
            )
            local pressScale = Instance.new("UIScale")
            pressScale.Name = "CloverPressScale"
            pressScale.Scale = 1
            pressScale.Parent = visibilityButton
            local pressTween
            local pressInInfo = TweenInfo.new(0.075, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
            local pressOutInfo = TweenInfo.new(0.16, Enum.EasingStyle.Back, Enum.EasingDirection.Out)

            visibilityButton.Name = "CloverHubVisibilityButton"
            visibilityButton.Active = true
            visibilityButton.Selectable = true
            visibilityButton.Interactable = true
            visibilityButton.AutoButtonColor = false
            visibilityButton.RichText = true
            visibilityButton.TextSize = 15
            visibilityButton.Size = UDim2.fromOffset(92, 32)
            visibilityButton.ZIndex = 100
            visibilityButton:SetAttribute("CloverHubInputMode", "Activated")
            visibilityButton:SetAttribute("CloverHubDragTolerance", dragTolerance)
            visibilityButton:SetAttribute("CloverHubPressScale", 0.965)

            local function tweenVisibilityButtonScale(targetScale, tweenInfo)
                if not pressScale.Parent then return end
                if pressTween then
                    pcall(function() pressTween:Cancel() end)
                end
                pressTween = TweenService:Create(pressScale, tweenInfo, { Scale = targetScale })
                pressTween:Play()
            end

            local function refreshVisibilityButton()
                local windowOpen = Library.Toggled == true
                if Window.MainFrame then
                    windowOpen = Window.MainFrame.Visible
                end
                visibilityButton:SetAttribute("CloverHubWindowOpen", windowOpen)
                visibilityButton.Text = windowOpen
                    and '<b><font color="#58E083">Clover</font></b>'
                    or '<b><font color="#C4C9D1">Clover</font></b>'
            end

            local function applyVisibilityRequest(requestId, desiredOpen, attempt)
                if requestId ~= visibilityRequestId
                    or not sessionAlive()
                    or not visibilityButton.Parent then
                    return
                end

                Window:Toggle(desiredOpen)
                refreshVisibilityButton()
                if Library.Toggled == desiredOpen then
                    visibilityButton:SetAttribute("CloverHubToggleQueued", false)
                    return
                end

                if attempt < 4 then
                    visibilityButton:SetAttribute("CloverHubToggleQueued", true)
                    task.delay(visibilityRetryDelay, function()
                        applyVisibilityRequest(requestId, desiredOpen, attempt + 1)
                    end)
                else
                    visibilityButton:SetAttribute("CloverHubToggleQueued", false)
                end
            end

            local function requestVisibilityToggle()
                visibilityRequestId += 1
                applyVisibilityRequest(visibilityRequestId, Library.Toggled ~= true, 1)
            end

            Library:GiveSignal(visibilityButton.InputBegan:Connect(function(input)
                local inputType = input.UserInputType
                if inputType == Enum.UserInputType.MouseButton1
                    or inputType == Enum.UserInputType.Touch then
                    pressButtonPosition = visibilityButton.AbsolutePosition
                    pressVisualInput = input
                    tweenVisibilityButtonScale(0.965, pressInInfo)
                end
            end))

            Library:GiveSignal(inputService.InputEnded:Connect(function(input)
                if input ~= pressVisualInput then return end
                pressVisualInput = nil
                tweenVisibilityButtonScale(1, pressOutInfo)
            end))

            Library:GiveSignal(visibilityButton.Activated:Connect(function()
                local startPosition = pressButtonPosition
                pressButtonPosition = nil
                if startPosition
                    and (visibilityButton.AbsolutePosition - startPosition).Magnitude > dragTolerance then
                    return
                end

                requestVisibilityToggle()
            end))

            if Window.MainFrame then
                Library:GiveSignal(Window.MainFrame:GetPropertyChangedSignal("Visible"):Connect(
                    refreshVisibilityButton
                ))
            end
            refreshVisibilityButton()
        end
    end
end

task.defer(function()
    pcall(function()
        for _, label in ipairs(Library.ScreenGui:GetDescendants()) do
            if label:IsA("TextLabel") and label.Text == "CloverHub" then
                label.TextColor3 = Color3.fromRGB(74, 222, 128)
                label.TextStrokeColor3 = Color3.fromRGB(22, 163, 74)
                label.TextStrokeTransparency = 0.38
                local oldGradient = label:FindFirstChild("CloverTitleGlow")
                if oldGradient then oldGradient:Destroy() end
                local gradient = Instance.new("UIGradient")
                gradient.Name = "CloverTitleGlow"
                gradient.Color = ColorSequence.new({
                    ColorSequenceKeypoint.new(0, Color3.fromRGB(187, 247, 208)),
                    ColorSequenceKeypoint.new(0.48, Color3.fromRGB(74, 222, 128)),
                    ColorSequenceKeypoint.new(1, Color3.fromRGB(22, 163, 74)),
                })
                gradient.Parent = label
            end
        end
    end)
end)

local BASE_WINDOW_SIZE = Vector2.new(680, 540)
local WINDOW_MARGIN = 24
local function applyResponsiveUIScale()
    local camera = workspace.CurrentCamera
    if not camera then return 1 end

    local viewport = camera.ViewportSize
    local scale = math.min(
        1,
        (viewport.X - WINDOW_MARGIN) / BASE_WINDOW_SIZE.X,
        (viewport.Y - WINDOW_MARGIN) / BASE_WINDOW_SIZE.Y
    )
    scale = math.clamp(scale, 0.55, 1)
    Library:SetDPIScale(scale * 100)

    local mainFrame = Library.ScreenGui and Library.ScreenGui:FindFirstChild("Main")
    if mainFrame and mainFrame:IsA("GuiObject") then
        mainFrame.Position = UDim2.new(
            0.5, -(BASE_WINDOW_SIZE.X * scale) / 2,
            0.5, -(BASE_WINDOW_SIZE.Y * scale) / 2
        )
    end
    return scale
end
applyResponsiveUIScale()
    end

    function ui.StyleTabs(Window, tabs)
        for _, button in ipairs(Library.TabButtons) do
            button.Label.Font = Enum.Font.RobotoMono
            button.Label.TextSize = 16
            button.Label.RichText = false
        end
Window.__ApplyMobileScrollFix = function(onlyTab)
    local inputService = game:GetService("UserInputService")
    if not (Library.IsMobile or inputService.TouchEnabled) then return end

    for _, tab in ipairs(onlyTab and { onlyTab } or tabs) do
        for _, side in ipairs(tab.Sides or {}) do
            pcall(function()
                side.Active = true
                side.ScrollingEnabled = true
                side.ScrollingDirection = Enum.ScrollingDirection.Y
                side.ElasticBehavior = Enum.ElasticBehavior.WhenScrollable

                side.ScrollBarThickness = 0
                side.ScrollBarImageTransparency = 1
                side.VerticalScrollBarInset = Enum.ScrollBarInset.None
            end)

            for _, nested in ipairs(side:GetDescendants()) do
                if nested:IsA("ScrollingFrame")
                    and nested.AbsoluteCanvasSize.Y <= nested.AbsoluteWindowSize.Y + 2 then
                    nested.ScrollingEnabled = false
                    nested.Active = false
                end
            end
        end
    end
end
    end

    function ui.PatchControls(SessionBox)
        local methods = getmetatable(SessionBox).__index
        if methods.__CloverPatched then return end
        methods.__CloverPatched = true
do
    local EXTRA_HEIGHT  = 6
    local CUSTOM_RADIUS = 8

    local Funcs = getmetatable(SessionBox).__index

    local function MakeDropdownLazy(Dropdown, startDirty)
        local origBuild = Dropdown.BuildDropdownList
        local menu = Dropdown.Menu
        if not (origBuild and menu and menu.Open) then return end

        local dirty = (startDirty == true)

        Dropdown.BuildDropdownList = function(...)
            if menu.Active then
                dirty = false
                return origBuild(...)
            end
            dirty = true
        end

        local origOpen = menu.Open
        menu.Open = function(mself, ...)
            if dirty then
                dirty = false
                origBuild()
            end
            return origOpen(mself, ...)
        end
    end

    local OriginalAddDropdown = Funcs.AddDropdown
    Funcs.AddDropdown = function(self, Idx, Info)
        local stashedValues = nil
        if type(Info) == "table" and type(Info.Values) == "table"
            and #Info.Values > 40 and Info.Default == nil then
            stashedValues = Info.Values
            Info.Values = {}
        end

        local Dropdown = OriginalAddDropdown(self, Idx, Info)

        MakeDropdownLazy(Dropdown, stashedValues ~= nil)
        if stashedValues then
            Dropdown.Values = stashedValues
            Dropdown.DefaultValues = stashedValues
        end

        local Children = self.Container:GetChildren()
        local Holder = Children[#Children]

        if Holder and Holder:IsA("Frame") then
            local hasLabel = Holder.Size.Y.Offset > 21
            Holder.Size = UDim2.new(1, 0, 0, (hasLabel and 39 or 21) + EXTRA_HEIGHT)

            local DisplayContainer = Holder:FindFirstChildWhichIsA("TextButton")
            if DisplayContainer then
                DisplayContainer.Size = UDim2.new(1, 0, 0, 21 + EXTRA_HEIGHT)

                local existingCorner = DisplayContainer:FindFirstChildOfClass("UICorner")
                if existingCorner then
                    existingCorner.CornerRadius = UDim.new(0, CUSTOM_RADIUS)
                else
                    local corner = Instance.new("UICorner")
                    corner.CornerRadius = UDim.new(0, CUSTOM_RADIUS)
                    corner.Parent = DisplayContainer
                end

                local DisplayButton = DisplayContainer:FindFirstChildWhichIsA("TextButton")
                if DisplayButton then
                    DisplayButton.Size = UDim2.new(1, 0, 0, 21 + EXTRA_HEIGHT)
                end

                DisplayContainer.TextYAlignment = Enum.TextYAlignment.Center
                for _, d in ipairs(DisplayContainer:GetDescendants()) do
                    if d:IsA("TextLabel") or d:IsA("TextButton") then
                        d.TextYAlignment = Enum.TextYAlignment.Center
                    end
                end
            end
        end

        return Dropdown
    end

    local OriginalAddInput = Funcs.AddInput
    Funcs.AddInput = function(self, Idx, Info)
        local Input = OriginalAddInput(self, Idx, Info)

        local Children = self.Container:GetChildren()
        local Holder = Children[#Children]

        if Holder and Holder:IsA("Frame") then
            local hasLabel = Holder.Size.Y.Offset > 21
            Holder.Size = UDim2.new(1, 0, 0, (hasLabel and 39 or 21) + EXTRA_HEIGHT)

            local Box = Holder:FindFirstChildWhichIsA("TextBox")
            if Box then
                Box.Size = UDim2.new(1, 0, 0, 21 + EXTRA_HEIGHT)
                Box.ClearTextOnFocus = false
                Box.TextScaled = false
                Box.TextSize = 13
                Box.TextYAlignment = Enum.TextYAlignment.Center
                for _, d in ipairs(Box:GetDescendants()) do
                    if d:IsA("TextLabel") or d:IsA("TextButton") then
                        d.TextYAlignment = Enum.TextYAlignment.Center
                    end
                end

                local existingCorner = Box:FindFirstChildOfClass("UICorner")
                if existingCorner then
                    existingCorner.CornerRadius = UDim.new(0, CUSTOM_RADIUS)
                else
                    local corner = Instance.new("UICorner")
                    corner.CornerRadius = UDim.new(0, CUSTOM_RADIUS)
                    corner.Parent = Box
                end
            end
        end

        return Input
    end
end
    end

local GAP         = 4

    local function isButtonPanel(el)
        if not el:IsA("Frame") then return false end
        local btns, hasBox, hasList = 0, false, false
        for _, g in ipairs(el:GetDescendants()) do
            if g:IsA("TextBox") then hasBox = true end
            if g:IsA("UIListLayout") then hasList = true end
            if g:IsA("TextButton") and g.BackgroundTransparency == 0 then btns = btns + 1 end
        end
        if hasBox then return false end
        if btns >= 2 then return true end
        if btns == 1 and hasList then return true end
        return false
    end

    local function isDivider(el)
        if not el:IsA("Frame") then return false end
        for _, c in ipairs(el:GetDescendants()) do
            if c:IsA("TextButton") or c:IsA("TextBox") then return false end
            if c:IsA("TextLabel") and c.Text ~= "" then return false end
            if c:IsA("UIListLayout") then return false end
            if c:IsA("ImageLabel") or c:IsA("ImageButton") then return false end
        end
        return true
    end

    local function isDynamicList(el)
        if not el:IsA("Frame") then return false end
        for _, g in ipairs(el:GetDescendants()) do
            if g:IsA("TextButton") and g.AutomaticSize == Enum.AutomaticSize.Y then return true end
        end
        return false
    end

    local mergedMember = {}
    for _, set in ipairs(CHK.mergeSets) do
        for _, m in ipairs(set) do mergedMember[m] = true end
    end

    local function cardifyBox(gb)
        local container = gb and gb.Container
        if not container then return end
        local clist = container:FindFirstChildOfClass("UIListLayout")
        if clist then clist.Padding = UDim.new(0, GAP) end

        for _, el in ipairs(container:GetChildren()) do
            if not el:IsA("GuiObject") then

            elseif el:GetAttribute("CloverHubStatusCard") == true then

            elseif mergedMember[el] then
                local mpad = el:FindFirstChildOfClass("UIPadding") or Instance.new("UIPadding")
                mpad.PaddingLeft = UDim.new(0, 10); mpad.PaddingRight = UDim.new(0, 10); mpad.Parent = el
                if el.ZIndex == 1 then el.ZIndex = 2 end
                for _, tl in ipairs(el:GetDescendants()) do
                    if tl:IsA("TextLabel") and not tl.TextWrapped then
                        tl.TextTruncate = Enum.TextTruncate.AtEnd
                    end
                    if tl:IsA("GuiObject") and tl.ZIndex == 1 then tl.ZIndex = 2 end
                end
            elseif isDivider(el) then
                el.Visible = false
                el.Size = UDim2.new(el.Size.X.Scale, el.Size.X.Offset, 0, 0)
            elseif isDynamicList(el) then

            else
                local panel = isButtonPanel(el)
                BindThemeProperty(el, "BackgroundColor3", CardThemeColor)
                el.BackgroundTransparency = 0
                if el:IsA("TextButton") then el.AutoButtonColor = false end
                if not el:FindFirstChildOfClass("UICorner") then
                    local ccc = Instance.new("UICorner"); ccc.CornerRadius = UDim.new(0, 6); ccc.Parent = el
                end
                if not el:FindFirstChildOfClass("UIStroke") then
                    local s = Instance.new("UIStroke")
                    BindThemeProperty(s, "Color", "OutlineColor"); s.Thickness = 1
                    s.ApplyStrokeMode = Enum.ApplyStrokeMode.Border; s.Parent = el
                end
                local pad = el:FindFirstChildOfClass("UIPadding") or Instance.new("UIPadding")
                pad.PaddingLeft = UDim.new(0, 10); pad.PaddingRight = UDim.new(0, 10); pad.Parent = el

                for _, tl in ipairs(el:GetDescendants()) do
                    if tl:IsA("TextLabel") and not tl.TextWrapped then
                        tl.TextTruncate = Enum.TextTruncate.AtEnd
                    end
                end

                if el:IsA("TextButton") then
                    if el.Size.Y.Offset < 30 then
                        el.Size = UDim2.new(el.Size.X.Scale, el.Size.X.Offset, 0, 30)
                    end
                    for _, kid in ipairs(el:GetChildren()) do
                        if kid:IsA("TextLabel") then
                            kid.TextYAlignment = Enum.TextYAlignment.Center
                        elseif kid:IsA("Frame") then
                            kid.AnchorPoint = Vector2.new(kid.AnchorPoint.X, 0.5)
                            kid.Position    = UDim2.new(kid.Position.X.Scale, kid.Position.X.Offset, 0.5, 0)
                        end
                    end
                elseif el:IsA("Frame") then
                    if panel then
                        pad.PaddingLeft = UDim.new(0, 4); pad.PaddingRight = UDim.new(0, 4)
                        pad.PaddingTop = UDim.new(0, 3); pad.PaddingBottom = UDim.new(0, 3)
                        if el.AutomaticSize ~= Enum.AutomaticSize.Y
                            and el.AutomaticSize ~= Enum.AutomaticSize.XY then
                            el.Size = UDim2.new(el.Size.X.Scale, el.Size.X.Offset, 0, el.Size.Y.Offset + 6)
                        end
                        for _, g in ipairs(el:GetDescendants()) do
                            if g:IsA("TextButton") and g.BackgroundTransparency == 0 then
                                local gs = g:FindFirstChildOfClass("UIStroke") or Instance.new("UIStroke")
                                BindThemeProperty(gs, "Color", "OutlineColor"); gs.Thickness = 1
                                gs.ApplyStrokeMode = Enum.ApplyStrokeMode.Border; gs.Parent = g
                            end
                        end
                    else
                        pad.PaddingLeft = UDim.new(0, 4); pad.PaddingRight = UDim.new(0, 4)
                        pad.PaddingTop = UDim.new(0, 3); pad.PaddingBottom = UDim.new(0, 3)
                        if el.AutomaticSize ~= Enum.AutomaticSize.Y
                            and el.AutomaticSize ~= Enum.AutomaticSize.XY then
                            el.Size = UDim2.new(el.Size.X.Scale, el.Size.X.Offset, 0, el.Size.Y.Offset + 6)
                        end
                        for _, g in ipairs(el:GetDescendants()) do
                            local box
                            if (g:IsA("TextButton") or g:IsA("TextBox")) and g.BackgroundTransparency == 0 then
                                box = g
                            elseif g:IsA("TextBox") and g.BackgroundTransparency == 1
                                and g.Parent and g.Parent:IsA("Frame")
                                and g.Parent ~= el and g.Parent.BackgroundTransparency == 0 then
                                box = g.Parent
                            end
                            if box then
                                BindThemeProperty(box, "BackgroundColor3", CardThemeColor)
                                if not box:FindFirstChildOfClass("UIStroke") then
                                    local bs = Instance.new("UIStroke")
                                    BindThemeProperty(bs, "Color", "OutlineColor"); bs.Thickness = 1
                                    bs.ApplyStrokeMode = Enum.ApplyStrokeMode.Border; bs.Parent = box
                                end
                            end
                        end
                    end
                end
            end
        end

        for _, set in ipairs(CHK.mergeSets) do
            local first = set[1]
            if first and first.Parent == container and not first:FindFirstChild("__vhMergeCard") then
                local backdrop = Instance.new("Frame")
                backdrop.Name = "__vhMergeCard"
                BindThemeProperty(backdrop, "BackgroundColor3", CardThemeColor)
                backdrop.BorderSizePixel = 0
                local bc = Instance.new("UICorner")
                bc.CornerRadius = UDim.new(0, 6)
                bc.Parent = backdrop
                local bstroke = Instance.new("UIStroke")
                BindThemeProperty(bstroke, "Color", "OutlineColor")
                bstroke.Thickness = 1
                bstroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
                bstroke.Parent = backdrop

                local function span()
                    pcall(function()
                        local last = set[#set]
                        local scale = Library.DPIScale or 1
                        local h = ((last.AbsolutePosition.Y + last.AbsoluteSize.Y)
                            - first.AbsolutePosition.Y) / scale
                        local padObj = first:FindFirstChildOfClass("UIPadding")
                        local pl = padObj and padObj.PaddingLeft.Offset or 0
                        local pr = padObj and padObj.PaddingRight.Offset or 0
                        local pt = padObj and padObj.PaddingTop.Offset or 0
                        backdrop.Position = UDim2.new(0, -pl, 0, -pt)
                        backdrop.Size = UDim2.new(1, pl + pr, 0, h)
                    end)
                end

                backdrop.Parent = first
                for _, m in ipairs(set) do
                    m:GetPropertyChangedSignal("AbsoluteSize"):Connect(span)
                    m:GetPropertyChangedSignal("AbsolutePosition"):Connect(span)
                end
                span()
                task.spawn(function()
                    local delays = { 1, 3, 8 }
                    for _, d in ipairs(delays) do
                        task.wait(d)
                        span()
                    end
                end)
            end
        end

        if clist then
            clist:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
                if gb.Resize then pcall(function() gb:Resize() end) end
            end)
        end
        task.defer(function()
            for _ = 1, 3 do task.wait() end
            if gb.Resize then pcall(function() gb:Resize() end) end
        end)
    end
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
do
        local obs = Library.ScreenGui
        if obs then
            local MAX_RADIUS = 4
            local function isInputField(x)
                return x and (x:IsA("TextBox") or (x:IsA("GuiObject") and x:FindFirstChildWhichIsA("TextBox") ~= nil))
            end
            local function restyle(d)
                if d:IsA("UICorner") then
                    if not isInputField(d.Parent) and d.CornerRadius.Scale == 0 and d.CornerRadius.Offset > MAX_RADIUS then
                        d.CornerRadius = UDim.new(0, MAX_RADIUS)
                    end
                elseif d:IsA("TextBox") then
                    local wrap = d.Parent
                    if wrap and wrap:IsA("GuiObject") and wrap.ClipsDescendants then
                        wrap.ClipsDescendants = false
                    end
                end
            end
            for _, d in ipairs(obs:GetDescendants()) do pcall(restyle, d) end
            obs.DescendantAdded:Connect(function(d) pcall(restyle, d) end)
        end
    end
    end
    Library.__CloverUI = ui
    return ui
end

return CloverUI
