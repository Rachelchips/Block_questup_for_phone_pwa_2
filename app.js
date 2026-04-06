"use strict";

(function () {
  const mainCanvas = document.getElementById("main-canvas");
  const overlayCanvas = document.getElementById("overlay-canvas");
  const hiddenInput = document.getElementById("canvas-input");
  const ctx = mainCanvas.getContext("2d", { alpha: true });
  const overlayCtx = overlayCanvas.getContext("2d", { alpha: true });

  const STORAGE_KEY = "questup-canvas-rpg-v1";
  const DPR_CAP = 2;
  const HERO_ROLE = "像素冒险家";
  const mainRegions = [];
  const overlayRegions = [];
  const textCache = new Map();
  const spriteCache = new Map();
  const anchors = {};
  const inputFieldMap = {};
  let desiredDesignHeight = 2300;
  let activeInput = null;
  let importFileInput = null;
  let pendingScrollTarget = null;
  let hoverCursor = "default";
  let hoverTooltip = null;
  let tooltipLongPress = null;
  let lastClick = { key: null, time: 0 };
  let companionStripLayout = null;
  let lastRenderedSelectedCompanionId = null;
  let mainScrollGesture = null;
  let overlayModalLayout = null;
  let overlayDrag = null;
  let overlayScrollGesture = null;
  let modalPageScrollLock = null;
  let uidCounter = 0;
  let currentView = null;
  let isComposingInput = false;
  let lastTodoDeadlineRenderSecond = null;
  const LONG_PRESS_DELAY_MS = 420;
  const LONG_PRESS_MOVE_TOLERANCE = 8;
  const PIXEL_FONT_STACK = '"MS Gothic", monospace';
  const CJK_PIXEL_FONT_STACK = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif';
  const BITMAP_DIGIT_GLYPHS = {
    "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
    "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
    "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
    "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
    "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
    "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
    "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
    "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
    "9": ["01110", "10001", "10001", "01111", "00001", "00010", "11100"],
    ":": ["0", "1", "0", "0", "1", "0", "0"],
    "/": ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
    "+": ["000", "010", "010", "111", "010", "010", "000"],
    "-": ["000", "000", "000", "111", "000", "000", "000"],
    ".": ["0", "0", "0", "0", "0", "1", "0"],
    "%": ["11001", "11010", "00100", "01000", "10110", "00110", "00000"],
    "(": ["001", "010", "100", "100", "100", "010", "001"],
    ")": ["100", "010", "001", "001", "001", "010", "100"],
    "（": ["001", "010", "100", "100", "100", "010", "001"],
    "）": ["100", "010", "001", "001", "001", "010", "100"]
  };
  const THEME = {
    sky: "#dfaa8f",
    skyGlow: "#f7daca",
    ground: "#8fa060",
    groundDark: "#628243",
    frameLight: "#d0a181",
    frame: "#74433a",
    frameDark: "#54302a",
    paper: "#eadfc9",
    paperSoft: "#efe5d1",
    paperMuted: "#d7ccb0",
    ink: "#402420",
    inkSoft: "#8f6558",
    black: "#050403",
    yellow: "#efc62a",
    yellowShadow: "#97730f",
    green: "#4aad33",
    greenShadow: "#2a6823",
    red: "#df2f2f",
    redShadow: "#84211d",
    blue: "#77b8ec",
    blueShadow: "#3b6b9f",
    lilac: "#b79acb",
    lilacShadow: "#6e5680",
    disabled: "#e2cf7a",
    disabledShadow: "#8d846b",
    disabledText: "#9b8b5f",
    barBg: "#d8ccb0",
    expA: "#f0cb27",
    expB: "#eedc73",
    hpA: "#51b032",
    hpB: "#7adc67",
    bossA: "#d24d4d",
    bossB: "#eb9a9a",
    toastBg: "#311d1a",
    toastInfo: "#f0cb27",
    toastSuccess: "#8fe07f",
    toastDanger: "#ff8e8e",
    overlayShade: "#1d1412",
    cloudA: "#fff3ea",
    cloudB: "#fff7ef",
    headerShadow: "#be8d71",
  };

  const BUTTON_VARIANTS = {
    yellow: { fill: THEME.yellow, shadow: THEME.yellowShadow, text: THEME.ink },
    green: { fill: THEME.green, shadow: THEME.greenShadow, text: "#f9f4d7" },
    red: { fill: THEME.red, shadow: THEME.redShadow, text: "#fff1ea" },
    blue: { fill: THEME.blue, shadow: THEME.blueShadow, text: "#f9f4d7" },
    lilac: { fill: THEME.lilac, shadow: THEME.lilacShadow, text: "#fff7ff" },
    paper: { fill: THEME.paper, shadow: THEME.black, text: THEME.ink },
    pager: { fill: THEME.frameLight, shadow: THEME.frameDark, text: THEME.ink },
    pagerDisabled: { fill: THEME.paperMuted, shadow: THEME.frame, text: THEME.inkSoft },
    disabled: { fill: THEME.disabled, shadow: THEME.disabledShadow, text: THEME.disabledText },
  };

  const DEFAULT_UI_THEME = "wood";
  const UI_THEME_PRESETS = {
    sunset: { id: "sunset", name: "\u6e29\u6696\u843d\u65e5", description: "\u6e29\u548c\u6696\u68d5\u8272\uff0c\u665a\u971e\u7684\u989c\u8272\u3002", sky: "#dfaa8f", skyGlow: "#f7daca", ground: "#8fa060", groundDark: "#628243", frameLight: "#d0a181", frame: "#74433a", frameDark: "#54302a", paper: "#eadfc9", paperSoft: "#efe5d1", paperMuted: "#d7ccb0", overlayShade: "#1d1412", cloudA: "#fff3ea", cloudB: "#fff7ef", headerShadow: "#be8d71", toastBg: "#311d1a" },
    wood: { id: "wood", name: "\u4f20\u7edf\u539f\u6728", description: "\u7ecf\u5178\u7684 RPG \u684c\u6e38\u914d\u8272\u611f\u3002", sky: "#d9c29d", skyGlow: "#ead8b9", ground: "#879760", groundDark: "#5f7240", frameLight: "#b88f5d", frame: "#6f4c2d", frameDark: "#4c331e", paper: "#efe2c8", paperSoft: "#f4e8d3", paperMuted: "#dac6a5", overlayShade: "#21160f", cloudA: "#f7ecd8", cloudB: "#fff5e6", headerShadow: "#9c744b", toastBg: "#332115" },
    midnight: { id: "midnight", name: "\u9ed1\u591c\u6df1\u84dd", description: "\u6df1\u591c\u5192\u9669\u611f\u66f4\u5f3a\uff0c\u8fb9\u6846\u504f\u975b\u84dd\u3002", sky: "#243354", skyGlow: "#374c76", ground: "#546f5a", groundDark: "#2f4939", frameLight: "#667aab", frame: "#253552", frameDark: "#172238", paper: "#dde3ee", paperSoft: "#e8edf7", paperMuted: "#b8c3d8", overlayShade: "#0d1421", cloudA: "#6d86b0", cloudB: "#95a8c9", headerShadow: "#1b2840", toastBg: "#111a2c" },
    maple: { id: "maple", name: "\u67ab\u7cd6\u6728\u5c4b", description: "\u504f\u7126\u7cd6\u4e0e\u8d64\u9676\uff0c\u50cf\u79cb\u5929\u6751\u5e84\u3002", sky: "#d9a17f", skyGlow: "#f4ceb0", ground: "#8f8f58", groundDark: "#655d36", frameLight: "#cc8554", frame: "#864631", frameDark: "#5f2d1d", paper: "#f1dfca", paperSoft: "#f5e8d8", paperMuted: "#dfc4a4", overlayShade: "#24120d", cloudA: "#ffe0cf", cloudB: "#fff0e6", headerShadow: "#ae6941", toastBg: "#3a1d14" },
    sage: { id: "sage", name: "\u82d4\u539f\u8336\u5ba4", description: "\u66f4\u5b89\u9759\u7684\u7eff\u7070\u7eb8\u672c\u6c14\u8d28\u3002", sky: "#cbd2bf", skyGlow: "#e0e6d6", ground: "#7b9168", groundDark: "#526445", frameLight: "#9cab86", frame: "#58664b", frameDark: "#3e4934", paper: "#ece8d8", paperSoft: "#f2efdf", paperMuted: "#d4ccb6", overlayShade: "#171c14", cloudA: "#eef2e4", cloudB: "#f8faee", headerShadow: "#7e8c6e", toastBg: "#22281d" },
    plum: { id: "plum", name: "\u6885\u5b50\u66ae\u8272", description: "\u73ab\u7070\u548c\u6df1\u6885\u8272\uff0c\u66f4\u504f\u6d6a\u6f2b\u50cf\u7d20\u5c4b\u3002", sky: "#d6b7be", skyGlow: "#ecd4da", ground: "#8e8a73", groundDark: "#66604d", frameLight: "#b98999", frame: "#754757", frameDark: "#53303e", paper: "#f0e0df", paperSoft: "#f5e9e8", paperMuted: "#dbc2c0", overlayShade: "#20151a", cloudA: "#f8e7ea", cloudB: "#fff0f2", headerShadow: "#965f6f", toastBg: "#332028" },
    lavender: { id: "lavender", name: "\u7d2b\u85e4\u82b1\u4e0b", description: "\u6df1\u4e00\u70b9\u7684\u7d2b\u8272\u7cfb\uff0c\u67d4\u548c\u5b89\u9759\u3002", sky: "#a89bb8", skyGlow: "#c9bfd8", ground: "#7a6e88", groundDark: "#524859", frameLight: "#8a7a9e", frame: "#5a4a6a", frameDark: "#3d3248", paper: "#e0dae8", paperSoft: "#ebe5f2", paperMuted: "#c8bed4", overlayShade: "#1a1624", cloudA: "#ddd6e8", cloudB: "#ede8f5", headerShadow: "#5d4d6e", toastBg: "#241e2e" },
    slate: { id: "slate", name: "\u96fe\u7070\u4e66\u623f", description: "\u4e2d\u6027\u7070\u4e0e\u6696\u7070\uff0c\u7b80\u6d01\u514b\u5236\u3002", sky: "#b5b0aa", skyGlow: "#d8d4cf", ground: "#8a8782", groundDark: "#5c5a56", frameLight: "#9c9892", frame: "#5d5a55", frameDark: "#3d3b38", paper: "#e2e0dc", paperSoft: "#ebe9e6", paperMuted: "#c8c6c2", overlayShade: "#181716", cloudA: "#e8e6e4", cloudB: "#f2f0ee", headerShadow: "#6c6966", toastBg: "#252322" },
    sakura: { id: "sakura", name: "\u590f\u65e5\u5e8f\u66f2", description: "\u7531\u8584\u8377\u548c\u67e0\u69a0\u6df7\u5408\u800c\u6210\u7684\u590f\u65e5\u6c14\u606f\u3002", sky: "#cfeee0", skyGlow: "#e3f7ec", ground: "#99c8ad", groundDark: "#5d8f77", frameLight: "#a8d7bd", frame: "#5f9f80", frameDark: "#3f6f58", paper: "#f1fbf6", paperSoft: "#f7fdf9", paperMuted: "#d7efe3", overlayShade: "#163329", cloudA: "#e5f6ef", cloudB: "#effbf4", headerShadow: "#6bb091", toastBg: "#204538" },
  };

  function settingsThemePresets() {
    return ["wood", "sunset", "midnight", "maple", "sage", "plum", "lavender", "slate", "sakura"]
      .map(function (key) { return UI_THEME_PRESETS[key]; })
      .filter(function (themePreset) { return !!themePreset; });
  }

  const DIFFICULTIES = {
    easy: { id: "easy", label: "轻松", exp: 12, gold: 8, hpCost: 4, bossDamage: 18, adventureGain: 10 },
    normal: { id: "normal", label: "普通", exp: 20, gold: 14, hpCost: 8, bossDamage: 30, adventureGain: 14 },
    hard: { id: "hard", label: "困难", exp: 32, gold: 22, hpCost: 12, bossDamage: 46, adventureGain: 18 },
  };

  const DIFFICULTY_ORDER = ["easy", "normal", "hard"];
  const TASK_BUCKET_ORDER = ["todo", "habit", "learn"];
  const TODO_SORT_ORDER = ["default", "deadline"];
  const TASK_BUCKET_OPTIONS = {
    todo: { selector: "待办事项 To do", sectionTitle: "To do", sectionSubtitle: "待办事项", badge: "To do", logLabel: "待办事项" },
    habit: { selector: "习惯养成 Habit", sectionTitle: "Habit", sectionSubtitle: "习惯养成", badge: "Habit", logLabel: "习惯养成" },
    learn: { selector: "技能学习 Learn", sectionTitle: "Learn", sectionSubtitle: "技能学习", badge: "Learn", logLabel: "技能学习" },
  };
  const PET_STAGES = ["幼年", "少年", "成年"];
  const CATEGORY_LABELS = {
    background: "背景",
    hair: "发型",
    top: "上装",
    bottom: "下装",
    item: "装备",
    supply: "补给",
    accessory: "配饰",
    petEgg: "宠物蛋",
  };
  const ITEM_RARITY_LEVELS = ["廉价", "普通", "精良", "稀有", "史诗"];

  // 初始就拥有的图鉴条目（“无”不计入图鉴）
  const INITIAL_CODEX_ITEMS = [
    { kind: "scene", key: "草地小径", name: "草地小径", desc: "阳光与草地，适合踏出第一步。", rarity: "廉价" },
    { kind: "hair", key: "短发", name: "短发", desc: "低调的发型。", rarity: "廉价" },
    { kind: "top", key: "新手上衣", name: "新手上衣", desc: "耐穿的衣服，冒险之选。", rarity: "廉价" },
    { kind: "bottom", key: "新手下装", name: "新手下装", desc: "耐穿的裤子，冒险之选。", rarity: "廉价" },
    { kind: "gear", key: "木剑", name: "木剑", desc: "朴素的木剑，是成为大师的起点。", rarity: "廉价" },
    { kind: "supply", key: "supply-apple-juice", name: "苹果汁", desc: "清甜的果汁，适合口渴来上一杯。", rarity: "廉价" },
    { kind: "supply", key: "supply-wheat-bread", name: "小麦面包", desc: "烤得松软的小麦面包，妈妈的味道。", rarity: "普通" },
    { kind: "supply", key: "supply-energy-potion", name: "能量药水", desc: "蓝色的液体，看起来很厉害的样子。", rarity: "精良" },
  ];

  // 成就定义（展示文案 + 判定逻辑 key）
  // 注意：id 必须全局唯一；logicKey 用于内部判断/统计时的语义标记
  // 另外：成就中的“冒险”仅指出发冒险（activeTrip），小游戏不计入冒险次数。
  const ACHIEVEMENTS = [
    // 专注类
    { id: "focus_first_task", category: "专注类", logicKey: "focus_first_task", name: "第一滴经验", description: "冒险很好的开始。", condition: "至少完成 1 个任务。", rewardText: "金币 +10" },
    { id: "focus_streak_3", category: "专注类", logicKey: "focus_streak_3", name: "不见不散", description: "三天都记得回来，说明这次你是认真的。", condition: "连续打卡 3 天。", rewardText: "金币 +30" },
    { id: "focus_pomodoro_1", category: "专注类", logicKey: "focus_pomodoro_1", name: "善用工具", description: "番茄钟，你的好伙伴。", condition: "第一次使用番茄钟。", rewardText: "金币 +10" },
    { id: "focus_tasks_10", category: "专注类", logicKey: "focus_tasks_10", name: "十连胜", description: "十次按下「完成」之后，列表安静了一小会儿。", condition: "累计完成 10 个任务。", rewardText: "金币 +40" },
    { id: "focus_tasks_50", category: "专注类", logicKey: "focus_tasks_50", name: "专注大师", description: "你在待办栏上画了好多好多小钩子。", condition: "累计完成 50 个任务。", rewardText: "金币 +100" },
    { id: "focus_tasks_100", category: "专注类", logicKey: "focus_tasks_100", name: "自律大神", description: "每一个任务，都在铺就你的道路。", condition: "累计完成 100 个任务。", rewardText: "金币 +200" },
    { id: "focus_streak_7", category: "专注类", logicKey: "focus_streak_7", name: "一周都记得来", description: "连续一整周，你每天都和这个小世界打了个招呼。", condition: "连续打卡 7 天。", rewardText: "金币 +80" },
    { id: "focus_streak_30", category: "专注类", logicKey: "focus_streak_30", name: "一天不落", description: "连续一整月，你每天都在这个世界留下奋斗的足迹。", condition: "连续打卡 30 天。", rewardText: "金币 +150" },

    // 等级
    { id: "level_2", category: "专注类", logicKey: "level_2", name: "冒险刚起步", description: "从 Lv.1 升到 Lv.2，小人正式踏出新手村门口。", condition: "角色等级达到 Lv.2。", rewardText: "金币 +20" },
    { id: "level_5", category: "专注类", logicKey: "level_5", name: "新手出村", description: "等级爬到 5 级，已经不是刚出生的小白板了。", condition: "角色等级达到 Lv.5。", rewardText: "金币 +50" },
    { id: "level_10", category: "冒险类", logicKey: "level_10", name: "小镇名人", description: "等级来到两位数，附近的怪物开始记住你的名字。", condition: "角色等级达到 Lv.10。", rewardText: "金币 +120" },
    { id: "level_20", category: "冒险类", logicKey: "level_20", name: "冒险老手", description: "走过二十级的长路，你已经是这个像素世界的老熟人了。", condition: "角色等级达到 Lv.20。", rewardText: "金币 +260" },

    // 收集类（商店购买）
    { id: "collection_shop_3", category: "收集类", logicKey: "collection_shop_3", name: "买买买", description: "从此以后，你不再是空手上路的新人。", condition: "在商店购买 3 件物品。", rewardText: "金币 +30" },
    { id: "collection_shop_10", category: "收集类", logicKey: "collection_shop_10", name: "花钱的快乐", description: "你已然成为冒险商店的常客。", condition: "在商店购买 10 件物品。", rewardText: "金币 +80" },
    { id: "collection_shop_30", category: "收集类", logicKey: "collection_shop_30", name: "购物狂人", description: "你差点就要把商店掏空啦。", condition: "在商店购买 30 件物品。", rewardText: "金币 +150" },

    // 收集类（图鉴/金币/宠物）
    { id: "collection_codex_10", category: "收集类", logicKey: "collection_codex_10", name: "收集爱好者", description: "贴纸越攒越多，冒险故事也开始有章节感了。", condition: "解锁图鉴条目总数达到 10 个。", rewardText: "金币 +30" },
    { id: "collection_gold_500", category: "收集类", logicKey: "collection_gold_500", name: "小有积蓄", description: "钱包不再只能发出铜币声，开始有点底气了。", condition: "金币数量达到 500。", rewardText: "金币 +80" },
    { id: "collection_gold_1000", category: "收集类", logicKey: "collection_gold_1000", name: "小有盈余", description: "钱包里第一次出现了四位数的金币。", condition: "金币数量达到 1000。", rewardText: "金币 +120" },
    { id: "collection_gold_2000", category: "收集类", logicKey: "collection_gold_2000", name: "金币真香", description: "金币堆得有点高了，可以考虑掏空商店。", condition: "金币数量达到 2000。", rewardText: "金币 +200" },
    { id: "collection_codex_20", category: "收集类", logicKey: "collection_codex_20", name: "集齐第一面", description: "你的冒险相册逐渐丰富起来。", condition: "解锁图鉴条目总数达到 20 个。", rewardText: "金币 +80" },
    { id: "collection_codex_50", category: "收集类", logicKey: "collection_codex_50", name: "图鉴爱好者", description: "再添几张贴纸，就要把这本图鉴贴满了。", condition: "解锁图鉴条目总数达到 50 个。", rewardText: "金币 +120" },
    { id: "collection_codex_100", category: "收集类", logicKey: "collection_codex_100", name: "图鉴收藏家", description: "你几乎认识了这个小世界里的所有角落。", condition: "解锁图鉴条目总数达到 100 个。", rewardText: "金币 +300" },
    { id: "collection_pet_3", category: "社交类", logicKey: "collection_pet_3", name: "小队成形", description: "身边已经有一支三人（兽）小队陪你冒险。", condition: "拥有 3 只已孵化的宠物。", rewardText: "金币 +100" },

    // 冒险类（仅出发冒险）
    { id: "adventure_first_trip", category: "冒险类", logicKey: "adventure_first_trip", name: "迈出第一步", description: "不再只是在营地里画地图，而是真的走了出去。", condition: "至少成功完成 1 次冒险。", rewardText: "金币 +20" },
    // 小游戏也属于冒险类成就，但不计入“冒险次数”成就的统计
    { id: "adventure_minigame_1", category: "冒险类", logicKey: "adventure_minigame_1", name: "休闲一下", description: "经典的小游戏，大大的满足。", condition: "至少成功完成 1 次小游戏。", rewardText: "金币 +20" },
    { id: "adventure_minigame_10", category: "冒险类", logicKey: "adventure_minigame_10", name: "小游戏熟手", description: "你已经摸清了节奏，开始能稳稳地飞一段路。", condition: "累计完成 10 次小游戏。", rewardText: "金币 +40" },
    { id: "adventure_minigame_50", category: "冒险类", logicKey: "adventure_minigame_50", name: "飞行老玩家", description: "反复挑战之后，手感和判断都更准了。", condition: "累计完成 50 次小游戏。", rewardText: "金币 +120" },
    { id: "adventure_minigame_100", category: "冒险类", logicKey: "adventure_minigame_100", name: "空中传说", description: "一百次挑战，你把耐心和专注都练出来了。", condition: "累计完成 100 次小游戏。", rewardText: "金币 +200" },
    { id: "adventure_minigame_tier1", category: "冒险类", logicKey: "adventure_minigame_tier1", name: "新手试飞", description: "先从新手难度起飞，稳住就赢。", condition: "在「新手」难度达成目标 1 次。", rewardText: "金币 +20" },
    { id: "adventure_minigame_tier2", category: "冒险类", logicKey: "adventure_minigame_tier2", name: "进阶挑战", description: "开始追求更高的目标，手感也更重要了。", condition: "在「进阶」难度达成目标 1 次。", rewardText: "金币 +60" },
    { id: "adventure_minigame_tier3", category: "冒险类", logicKey: "adventure_minigame_tier3", name: "极限飞行", description: "极限难度也敢上，说明你已经不怕失误了。", condition: "在「极限」难度达成目标 1 次。", rewardText: "金币 +120" },
    { id: "adventure_trips_5", category: "冒险类", logicKey: "adventure_trips_5", name: "五次短途", description: "你已经熟悉了从营地出发再回来这条路。", condition: "成功完成 5 次冒险。", rewardText: "金币 +60" },
    { id: "adventure_trips_20", category: "冒险类", logicKey: "adventure_trips_20", name: "熟门熟路", description: "营地附近的每块石头，你大概都见过很多次了。", condition: "成功完成 20 次冒险。", rewardText: "金币 +150" },
    { id: "adventure_slots_max", category: "冒险类", logicKey: "adventure_slots_max", name: "背包塞满勇气", description: "冒险槽拉满的时候，看什么路都觉得能走。", condition: "当前冒险槽达到上限值。", rewardText: "金币 +80" },
    { id: "adventure_all_locations_once", category: "冒险类", logicKey: "adventure_all_locations_once", name: "这一片我熟", description: "在同一个地点来来回回，总算摸熟了这条路。", condition: "在任意一个冒险地点成功完成 5 次冒险。", rewardText: "金币 +50" },
    { id: "adventure_first_boss", category: "冒险类", logicKey: "adventure_first_boss", name: "首战告捷", description: "我可以战胜我自己！", condition: "击败 1 个 Boss。", rewardText: "金币 +30" },
    { id: "adventure_boss_5", category: "冒险类", logicKey: "adventure_boss_5", name: "占据上风", description: "来吧困难，你打不到我的！", condition: "击败 5 个 Boss。", rewardText: "金币 +80" },
    { id: "adventure_pet_hatched", category: "社交类", logicKey: "adventure_pet_hatched", name: "第一个伙伴", description: "蛋壳里蹦出来的，不只是宠物，也是你的同行者。", condition: "成功孵化 1 个宠物。", rewardText: "金币 +30" },
    { id: "adventure_pet_adult", category: "社交类", logicKey: "adventure_pet_adult", name: "一路养到成年", description: "从一颗小蛋到成年伙伴，你们一起走完了成长条。", condition: "至少有一只宠物从幼年成长为成年阶段。", rewardText: "金币 +80" },
    { id: "social_first_companion", category: "社交类", logicKey: "social_first_companion", name: "你好吗？", description: "第一次和旅途中的伙伴认真打招呼，这个世界就多了一张熟悉的面孔。", condition: "遇见第一个伙伴。", rewardText: "金币 +20" },
    { id: "social_companion_5", category: "社交类", logicKey: "social_companion_5", name: "渐渐融入", description: "路上遇见的人越来越多，你也慢慢成了他们故事里的一部分。", condition: "遇见 5 个伙伴。", rewardText: "金币 +80" },
    { id: "social_gift_3", category: "社交类", logicKey: "social_gift_3", name: "高情商", description: "礼物送出去之后，关系也跟着一点点变柔软了。", condition: "送礼 3 次。", rewardText: "金币 +50" },
    { id: "social_affection_lv3_1", category: "社交类", logicKey: "social_affection_lv3_1", name: "找朋友", description: "把一位伙伴的好感提升到 Lv.3，说明你们已经不只是点头之交了。", condition: "把一个伙伴的好感度提升到 Lv.3。", rewardText: "金币 +80" },
    { id: "social_affection_lv3_5", category: "社交类", logicKey: "social_affection_lv3_5", name: "人气王", description: "五位伙伴都和你熟起来了，你已经是营地里很受欢迎的人。", condition: "把五个朋友的好感度提升到 Lv.3。", rewardText: "金币 +180" },

    // 其他
    { id: "misc_customize_avatar", category: "其他", logicKey: "misc_customize_avatar", name: "这是我自己", description: "屏幕上的像素人，终于和镜子里的那个人有点像了。", condition: "至少修改过一次角色外观。", rewardText: "金币 +20" },
    { id: "misc_theme_switch", category: "其他", logicKey: "misc_theme_switch", name: "换个颜色换个心情", description: "当背景颜色变了，今天的心情也跟着刷新了一下。", condition: "至少成功切换过 1 次界面主题。", rewardText: "金币 +20" },
    { id: "misc_daily_signin_7", category: "其他", logicKey: "misc_daily_signin_7", name: "一周都没落下", description: "七个小格子都被点亮，这一周你和生活保持了连接。", condition: "累计完成 7 天每日签到（不要求连续）。", rewardText: "金币 +100" },
    { id: "misc_first_task_created", category: "其他", logicKey: "misc_first_task_created", name: "写下第一件事", description: "把想做的事写下来，旅程就开始了。", condition: "新建第一个任务。", rewardText: "金币 +20" },
    { id: "misc_first_reward_created", category: "其他", logicKey: "misc_first_reward_created", name: "甜头要安排", description: "奖励清单也要有，才走得更远。", condition: "新建第一个奖励。", rewardText: "金币 +20" },
    { id: "misc_first_rest", category: "其他", logicKey: "misc_first_rest", name: "第一次补给", description: "该补就补，状态回来了再继续冒险。", condition: "第一次使用任意一个补给。", rewardText: "金币 +20" },
    { id: "misc_rest_chill", category: "其他", logicKey: "misc_rest_chill", name: "能量上头", description: "偶尔来一瓶能量药水，也是在认真照顾自己。", condition: "使用一次「能量药水」。", rewardText: "金币 +30" },
    { id: "misc_export_save", category: "其他", logicKey: "misc_export_save", name: "安全意识", description: "你认真地把这段冒险打包存档了一次。", condition: "至少成功导出过 1 次存档。", rewardText: "金币 +30" },
    { id: "misc_import_save", category: "其他", logicKey: "misc_import_save", name: "异世界迁移", description: "你从另一个存档里把冒险人生搬了过来。", condition: "至少成功导入过 1 次存档。", rewardText: "金币 +30" },
    { id: "misc_reset_once", category: "其他", logicKey: "misc_reset_once", name: "重开人生", description: "漫漫人生路，愿你我都有重新开始的勇气。", condition: "至少执行过 1 次数据初始化。", rewardText: "金币 +50" },
    { id: "misc_logs_20", category: "其他", logicKey: "misc_logs_20", name: "冒险日记本", description: "日志里已经躺着二十条形形色色的小事。", condition: "日志条目累计达到 20 条。", rewardText: "金币 +50" },
  ];

  const ACHIEVEMENT_CATEGORIES = [
    { id: "all", label: "全部" },
    { id: "专注类", label: "专注类" },
    { id: "收集类", label: "收集类" },
    { id: "冒险类", label: "冒险类" },
    { id: "社交类", label: "社交类" },
    { id: "其他", label: "其他" },
  ];
  const ITEM_RARITY_FRAME_COLORS = {
    "廉价": null,
    "普通": "#8a5f38",
    "精良": "#2f8a3f",
    "稀有": "#7a4bd6",
    "史诗": "#d6b45a",
  };
  function itemRarityLabel(item) {
    if (!item) return "廉价";
    const value = String(item.rarity || "").trim();
    return ITEM_RARITY_LEVELS.indexOf(value) >= 0 ? value : "廉价";
  }
  function itemRequiredLevel(item) {
    const explicitLevel = Number(item && item.unlockLevel);
    if (Number.isFinite(explicitLevel) && explicitLevel > 0) return Math.floor(explicitLevel);
    return 1;
  }
  function itemRarityFrameColor(item) {
    const rarity = itemRarityLabel(item);
    return ITEM_RARITY_FRAME_COLORS[rarity] || null;
  }
  function catalogPetEggBySpecies(species) {
    return SHOP_CATALOG.find(function (entry) { return entry && entry.category === "petEgg" && entry.petSpecies === species; }) || null;
  }
  function petRarityLabel(pet) {
    if (!pet) return "廉价";
    const value = String(pet.rarity || "").trim();
    if (ITEM_RARITY_LEVELS.indexOf(value) >= 0) return value;
    const eggItem = catalogPetEggBySpecies(pet.species);
    return itemRarityLabel(eggItem);
  }
  function petRarityFrameColor(pet) {
    const rarity = petRarityLabel(pet);
    return ITEM_RARITY_FRAME_COLORS[rarity] || null;
  }

  function bossRarityFrameColor(boss) {
    const level = Number(boss && boss.level) || 1;
    const index = Math.min(ITEM_RARITY_LEVELS.length - 1, Math.max(0, level - 1));
    const rarity = ITEM_RARITY_LEVELS[index];
    return ITEM_RARITY_FRAME_COLORS[rarity] || null;
  }
  const COLLECTION_KEYS = {
    background: "backgrounds",
    hair: "hairStyles",
    top: "topStyles",
    bottom: "bottomStyles",
    item: "weapons",
    accessory: "accessories",
  };
  const APPEARANCE_KEYS = {
    background: "background",
    hair: "hairStyle",
    top: "topStyle",
    bottom: "bottomStyle",
    item: "weapon",
    accessory: "accessory",
  };

  const COLOR_OPTIONS = {
    skin: [["雪白", "#faf0e6"], ["浅砂", "#e7c09b"], ["暖黄", "#e0b890"], ["暖米", "#d5a883"], ["蜂蜜", "#c98f63"], ["焦糖", "#af7852"], ["赤陶", "#8f5d3b"], ["可可", "#6f4731"], ["阿凡达蓝", "#3d7bbf"], ["僵尸绿", "#8a9a7a"]],
    hairColor: [
      ["樱桃红", "#b24d4d"], ["莓粉", "#d55f95"], ["樱粉", "#f4b4c8"], ["玫瑰金", "#b76e79"],
      ["麦金", "#c8a33d"], ["浅金", "#e5d9a8"], ["蜜糖棕", "#8b6914"], ["夜棕", "#70503b"], ["栗棕", "#5c4033"], ["墨黑", "#2d2a26"],
      ["森林绿", "#4e7c58"], ["薄荷绿", "#7eb89a"],
      ["海军蓝", "#49638f"],
      ["薰衣草紫", "#9b8fb5"],
      ["霜白", "#e8e1d1"], ["银灰", "#a8a9ad"], ["雾灰", "#8e8b93"],
    ],
    eyeColor: [
      ["曜石黑", "#171311"], ["深棕", "#4e3427"], ["赤褐", "#8b4513"],
      ["琥珀金", "#b88a2f"], ["樱粉", "#c97b8a"], ["玫瑰金", "#b76e79"],
      ["森林绿", "#4d8c5d"], ["薄荷绿", "#5a9b7a"], ["墨绿", "#2d4a3e"],
      ["海蓝", "#4d79cc"], ["灰蓝", "#5c6b7a"], ["天蓝", "#6eb5e8"],
      ["葡萄紫", "#7552b0"],
      ["浅灰", "#7a7878"],
    ],
    topColor: [
      ["中国红", "#c41e3a"], ["深红", "#8b2942"], ["酒红", "#7d4250"], ["暖砖红", "#be654c"], ["蜜桃粉", "#d98b8b"], ["浅粉", "#e8c4c4"],
      ["琥珀黄", "#d6a43d"], ["樱草黄", "#e6e06d"], ["珊瑚橙", "#e07a5f"],
      ["草地绿", "#52a04d"], ["薄荷绿", "#7eb89a"], ["橄榄绿", "#667546"], ["军绿", "#4a5d3a"], ["森林墨", "#45604a"], ["墨绿", "#2d4a3e"],
      ["湖水蓝", "#4fb1b2"], ["天蓝", "#6eb5e8"], ["深夜蓝", "#365189"], ["藏青", "#2c3e5a"],
      ["薰衣草紫", "#9b8fb5"], ["雾紫", "#8077a5"], ["深紫", "#4a3d5c"],
      ["巧克力棕", "#5d4037"], ["麦土棕", "#7a5f46"], ["浅卡其", "#c4b896"],
      ["米白", "#f5f0e1"], ["月影灰", "#7b7a8e"], ["石板灰", "#5d6873"], ["炭黑", "#3f342d"],
    ],
    bottomColor: [
      ["中国红", "#c41e3a"], ["深红", "#8b2942"], ["酒红", "#7d4250"], ["暖砖红", "#be654c"], ["蜜桃粉", "#d98b8b"], ["浅粉", "#e8c4c4"],
      ["琥珀黄", "#d6a43d"], ["樱草黄", "#e6e06d"], ["珊瑚橙", "#e07a5f"],
      ["草地绿", "#52a04d"], ["薄荷绿", "#7eb89a"], ["橄榄绿", "#667546"], ["军绿", "#4a5d3a"], ["森林墨", "#45604a"], ["墨绿", "#2d4a3e"],
      ["湖水蓝", "#4fb1b2"], ["天蓝", "#6eb5e8"], ["深夜蓝", "#365189"], ["藏青", "#2c3e5a"],
      ["薰衣草紫", "#9b8fb5"], ["雾紫", "#8077a5"], ["深紫", "#4a3d5c"],
      ["巧克力棕", "#5d4037"], ["麦土棕", "#7a5f46"], ["浅卡其", "#c4b896"],
      ["米白", "#f5f0e1"], ["月影灰", "#7b7a8e"], ["石板灰", "#5d6873"], ["炭黑", "#3f342d"],
    ],
  };

  const EYE_STYLES = ["圆眼", "亮眼", "大眼", "瞪眼", "豆豆眼", "空瞳", "眯眼", "微笑眼", "困眼", "星星眼", "泪眼"];
  const MOUTH_COLORS = { "深棕": "#7f534f", "浅色": "#a89088", "肉粉": "#d4a090", "红": "#b24d4d" };
  const MOUTH_SHAPES = ["平口", "樱桃小嘴", "小O嘴", "微笑"];
  const MOUTH_STYLES = (function () {
    const list = [];
    MOUTH_SHAPES.forEach(function (shape) {
      Object.keys(MOUTH_COLORS).forEach(function (color) { list.push(shape + "-" + color); });
    });
    list.push("无嘴");
    return list;
  })();
  function parseMouthStyle(ms) {
    if (!ms || ms === "无嘴") return { shape: "无嘴", color: null };
    const idx = (ms || "").lastIndexOf("-");
    if (idx < 0) return { shape: ms || "平口", color: MOUTH_COLORS["深棕"] };
    const shape = ms.slice(0, idx);
    const colorName = ms.slice(idx + 1);
    const color = MOUTH_COLORS[colorName] || MOUTH_COLORS["深棕"];
    return { shape: shape, color: color };
  }
  const HAIR_STYLES = ["短发", "中式丸子头", "波波头", "高马尾", "碎刘海", "光头", "锅盖头", "刺头", "微分碎盖", "爆炸头", "丸子头", "双丸子头", "大波浪", "长直发", "双麻花辫", "侧麻花辫"];
  const TOP_STYLES = ["新手上衣", "冒险外套", "骑士束衣", "铁甲", "皮甲", "小斗篷", "露肩装", "短袖", "背心", "一字肩"];
  const BOTTOM_STYLES = ["新手下装", "旅行短裤", "山路工装", "长裙", "短裙", "轻甲护腿"];

  const SCENE_THEMES = {
    "草地小径": { sky: "#a7d3e7", cloud: "#d8edf5", groundA: "#8fc35c", groundB: "#6f9948", accent: "#d8977b", kind: "meadow" },
    "月夜营地": { sky: "#20335f", cloud: "#38588e", groundA: "#355f47", groundB: "#1d3e2c", accent: "#f0e177", kind: "moon" },
    "黄昏山坡": { sky: "#d5c49d", cloud: "#f3edd0", groundA: "#7b9c62", groundB: "#536c48", accent: "#cf9d5f", kind: "hill" },
    "城堡前庭": { sky: "#b8d3e2", cloud: "#d9e7ed", groundA: "#879b74", groundB: "#58694f", accent: "#ede8db", kind: "gate" },
    "薄雾草甸": { sky: "#bfd6e4", cloud: "#edf4f7", groundA: "#a7d39b", groundB: "#7aac68", accent: "#7ea45b", kind: "post" },
    "午后街角": { sky: "#e4c3b1", cloud: "#f5e2d7", groundA: "#d2b39d", groundB: "#ae866c", accent: "#f8f4e8", kind: "street" },
    "静默书库": { sky: "#d3c7aa", cloud: "#e8dfc7", groundA: "#9d7452", groundB: "#6e5039", accent: "#e7c779", kind: "library" },
    "潮汐海岸": { sky: "#b8dcee", cloud: "#e8f5fb", groundA: "#d7ca9e", groundB: "#baa770", accent: "#6aaed6", kind: "beach" },
    "旧日遗迹": { sky: "#ddd6e5", cloud: "#f2edf7", groundA: "#b6afbe", groundB: "#8a7f8c", accent: "#7f747f", kind: "ruins" },
    "樱花深巷": { sky: "#f3d4ea", cloud: "#f8ecf3", groundA: "#a6cb8f", groundB: "#7fa56c", accent: "#de97bc", kind: "sakura" },
    "落雪驿站": { sky: "#d7e1ef", cloud: "#edf4fb", groundA: "#dbe6f1", groundB: "#c0cfde", accent: "#9faec0", kind: "snow" },
    "极光边境": { sky: "#6174ad", cloud: "#b597f2", groundA: "#567474", groundB: "#344c4a", accent: "#9ef8dc", kind: "aurora" },
    "水下": { sky: "#1b4f7d", cloud: "#4fa9d9", groundA: "#14535c", groundB: "#0b3036", accent: "#7ad4ff", kind: "underwater" },
  };

  const PET_SPECIES = {
    chick: { id: "chick", name: "像素小鸡", intro: "一只叽叽喳喳的小伙伴，总能带来一点元气。", color: "#efd24d", shade: "#d7b53a", light: "#f8ec9a", detail: "#d98b36", accent: "#fff6df", eye: "#5b4a18" },
    slime: { id: "slime", name: "专注史莱姆", intro: "圆滚滚的专注伙伴，陪你把注意力拉回来。", color: "#5fcb71", shade: "#3aa451", light: "#a6eb9e", detail: "#2c8340", accent: "#d7f7b7", eye: "#224f2d" },
    fox: { id: "fox", name: "月狐", intro: "夜色里最灵巧的同伴，安静但很可靠。", color: "#efbc74", shade: "#d69548", light: "#f6ddae", detail: "#fff0d4", accent: "#e89255", eye: "#5a3a1d" },
    cat: { id: "cat", name: "像素小猫", intro: "一只黏人的小猫，想被摸摸的时候会凑过来。", color: "#dec39c", shade: "#b28f65", light: "#f2e7d2", detail: "#8a6f4d", accent: "#f8f2e4", eye: "#4a3929" },
    alarmBeast: { id: "alarmBeast", name: "闹钟小兽", intro: "很有时间观念的一个小怪物，是行走的闹钟。", color: "#c3a074", shade: "#8a6a45", light: "#e7d2b6", detail: "#d6b45a", accent: "#7a4bd6", eye: "#2b1d14" },
    dayGhost: { id: "dayGhost", name: "白昼幽灵", intro: "白天出没、晚上睡觉，作息规律的可爱幽灵。", color: "#f8f9fc", shade: "#b8bec9", light: "#ffffff", detail: "#e0e4eb", accent: "#d6b45a", eye: "#1a1d22" },
    tidyCrow: { id: "tidyCrow", name: "整洁乌鸦", intro: "一只爱干净的白色乌鸦，会把乱糟糟的东西整理清爽。", color: "#f1f2f4", shade: "#b8bec9", light: "#ffffff", detail: "#d6b45a", accent: "#7a4bd6", eye: "#1a1d22" },
  };

  const BOSS_ROTATION = [
    { id: "focus-slime", name: "分心史莱姆", level: 1, mood: "稳定", maxHp: 48, description: "它会把注意力切得很碎。番茄钟最克它。", tip: "专注结束再交任务，节奏更稳。", kind: "slime" },
    { id: "delay-giant", name: "拖延巨兽", level: 1, mood: "烦闷", maxHp: 98, description: "它专门吃掉开始前的犹豫，拖得越久越壮。", tip: "先完成最小一步，能持续压制它。", kind: "giant" },
    { id: "night-ghost", name: "熬夜幽灵", level: 2, mood: "游荡", maxHp: 120, description: "它在深夜偷走第二天状态，最怕规律收尾。", tip: "每日任务能持续压制它。", kind: "ghost" },
    { id: "abyss-kraken", name: "深渊触须", level: 2, mood: "窃语", maxHp: 180, description: "它专门缠住你开始前的那一刻，总在耳边低语“再等等”。", tip: "在 8 小时内多完成几次「开始就好」的小任务，能趁它分心时把血条打空。", kind: "kraken", timeLimitHours: 8 },
    { id: "chaos-crow", name: "混乱乌鸦", level: 2, mood: "吵闹", maxHp: 320, description: "它把桌面、脑袋和日程都搅在一起。", tip: "整理与复盘类任务会打断它的节奏。", kind: "crow" },
    { id: "frost-yeti", name: "雪原魇灵", level: 2, mood: "寂静", maxHp: 220, description: "它让时间像被冻住一样，计划一拖再拖。", tip: "给重要任务设好截止时间，并在 16 小时内稳步推进，就能融化它带来的寒气。", kind: "yeti", timeLimitHours: 16 },
  ];
  const BOSS_LOOT_BY_LEVEL = {
    1: [{ r: "廉价", p: 1 }],
    2: [{ r: "廉价", p: 0.7 }, { r: "普通", p: 0.3 }],
    3: [{ r: "廉价", p: 0.2 }, { r: "普通", p: 0.6 }, { r: "精良", p: 0.2 }],
    4: [{ r: "普通", p: 0.3 }, { r: "精良", p: 0.4 }, { r: "稀有", p: 0.3 }],
    5: [{ r: "稀有", p: 0.7 }, { r: "史诗", p: 0.3 }]
  };

  const HERO_MOOD_LEVELS = [
    { level: 5, name: "神采奕奕", min: 0.9, max: 1.0, expMultiplier: 2.0, desc: "眼底闪烁着远方的光，现在正是向最高峰冲锋的好时机" },
    { level: 4, name: "干劲十足", min: 0.65, max: 0.89, expMultiplier: 1.2, desc: "脚下的步履轻盈而坚定，前方的路途等待你的探索" },
    { level: 3, name: "状态平稳", min: 0.35, max: 0.64, expMultiplier: 1.0, desc: "长路漫漫，这种不疾不徐的节奏，才是抵达终点的关键" },
    { level: 2, name: "略显疲惫", min: 0.11, max: 0.34, expMultiplier: 0.8, desc: "行囊似乎变沉了些，找棵茂密的树歇歇脚，再看一眼地图吧" },
    { level: 1, name: "十分疲惫", min: 0.0, max: 0.10, expMultiplier: 0.5, desc: "辛苦啦，请在这里卸下负重休息一会儿吧，等力气回来了再出发" }
  ];

  const PET_CARE_OPTIONS = [
    { id: "pet-pat", name: "抚摸", price: 25, growth: 16, icon: "pat" },
    { id: "pet-feed", name: "喂食", price: 55, growth: 40, icon: "feed" },
    { id: "pet-potion", name: "喂成长药水", price: 102, growth: 84, icon: "potion" },
  ];

  const ADVENTURE_LOCATIONS = [
    { id: "misty-meadow", name: "薄雾草甸", cost: 20, minutes: 2, scene: "薄雾草甸", desc: "可带回金币、装备与宠物蛋，薄雾草甸背景有机会掉落。", backgroundRewardId: "bg-misty", loot: ["weapon-spear", "egg-slime"], unlockLevel: 1 },
    { id: "street-corner", name: "午后街角", cost: 28, minutes: 5, scene: "午后街角", desc: "适合拾到发型与小型奖励，街角背景会越刷越容易掉。", backgroundRewardId: "bg-street", loot: ["hair-bob", "egg-chick"], unlockLevel: 1 },
    { id: "quiet-library", name: "静默书库", cost: 36, minutes: 10, scene: "静默书库", desc: "可带回金币、装备与宠物蛋，书库背景有机会掉落。", backgroundRewardId: "bg-library", loot: ["weapon-book", "acc-goggles", "egg-cat"], unlockLevel: 2 },
    { id: "tide-coast", name: "潮汐海岸", cost: 44, minutes: 15, scene: "潮汐海岸", desc: "可带回金币、装备与宠物蛋，海岸背景会随探索次数提高掉率。", backgroundRewardId: "bg-coast", loot: ["bottom-travel", "egg-fox"], unlockLevel: 3 },
    { id: "old-ruins", name: "旧日遗迹", cost: 54, minutes: 30, scene: "旧日遗迹", desc: "可带回金币、装备与宠物蛋，遗迹背景只能靠探索掉落。", backgroundRewardId: "bg-ruins", loot: ["acc-cloak", "weapon-staff"], unlockLevel: 5 },
    { id: "sakura-lane", name: "樱花深巷", cost: 62, minutes: 45, scene: "樱花深巷", desc: "更容易带回配饰与宠物蛋，樱花深巷背景要靠在这里探索获得。", backgroundRewardId: "bg-sakura", loot: ["acc-star", "egg-fox"], unlockLevel: 6 },
    { id: "snow-station", name: "落雪驿站", cost: 72, minutes: 60, scene: "落雪驿站", desc: "会带回金币、装备与宠物蛋，雪地背景有机会掉落。", backgroundRewardId: "bg-snow", loot: ["top-knight", "egg-cat"], unlockLevel: 8 },
    { id: "aurora-edge", name: "极光边境", cost: 88, minutes: 90, scene: "极光边境", desc: "稀有掉落更集中，极光边境背景要靠反复探索带回。", backgroundRewardId: "bg-aurora", loot: ["hair-pony", "weapon-spear"], unlockLevel: 10 },
  ];
  const ADVENTURE_STORY_LIBRARY = {
    "misty-meadow": [
      "清晨的雾刚散开，你在{scene}的草尖上看见了一滴像玻璃珠一样发亮的露水。",
      "你路过一片低伏的草坡时，一只圆滚滚的小家伙正把露珠顶在头上晒太阳。",
      "风从草甸深处吹来，把一阵潮湿又清新的气味悄悄塞进了你的口袋。"
    ],
    "street-corner": [
      "街角咖啡的香气跟着风拐了个弯，让你差点以为自己只是出来散步。",
      "你在斑驳墙面旁听见远处的自行车铃声，像有人替午后按下了暂停键。",
      "橘色的夕光爬上窗框时，连路边的影子都看起来像在发呆。"
    ],
    "quiet-library": [
      "翻书声从高处书架间落下来，轻得像是谁把秘密放回了原位。",
      "你在最里面的书架边停了一会儿，空气里全是纸页和木头被时间晒过的味道。",
      "一张旧借书卡从书里滑出来，上面只写着一句“记得慢一点”。"
    ],
    "tide-coast": [
      "海浪退下去时，沙地上留下的细碎贝壳像一串没有说完的话。",
      "你沿着潮线往前走，鞋边沾到一点盐味，心情也被海风吹得轻了。",
      "一只白色海鸟从你头顶掠过去，把傍晚的海面划出了一道亮线。"
    ],
    "old-ruins": [
      "断墙背后的风声像很久以前留下的回音，还在等谁路过。",
      "你摸过一块发凉的石砖，忽然觉得这座遗迹曾经一定很热闹。",
      "藤蔓缠着旧柱慢慢往上爬，像时间把故事重新写了一遍。"
    ],
    "sakura-lane": [
      "花瓣落在肩头的时候，你差点把这次探路误认成了一场散步。",
      "巷口的风一吹，整条路都像有人撒下了一把很轻很轻的粉色纸片。",
      "你抬头时正好看见一片花瓣打着旋落下，慢得像故意留给人许愿。"
    ],
    "snow-station": [
      "站牌边的积雪被风削得很整齐，像有人刚刚在这里等过车。",
      "呼出的白气在空气里停了一小会儿，才肯慢吞吞地散开。",
      "远处传来铁轨轻轻震动的声音，像冬天在很认真地说话。"
    ],
    "aurora-edge": [
      "极光在天边换了一次颜色，像夜空把秘密折成丝带递给了你。",
      "你站在风里抬头看了很久，直到群星和雪原都安静得像一幅画。",
      "天幕最亮的时候，连脚边的冰面都映出了一点柔和的绿光。"
    ]
  };
  const ADVENTURE_STORY_FALLBACKS = [
    "归途上回头看了一眼，你忽然觉得这趟冒险已经悄悄长成了一段故事。",
    "风把沿路的声音都揉在一起，最后只留下了很适合记住的一瞬间。",
    "你把这趟路的景色装进口袋里，回营地时连脚步都轻了一点。"
  ];
  const SOCIAL_TABS = { pets: "pets", companions: "companions" };
  const GIFTABLE_SHOP_CATEGORIES = ["hair", "top", "bottom", "item", "supply", "accessory"];
const COMPANION_ENCOUNTER_CHANCE = 0.7;
  const COMPANION_AFFECTION_LEVELS = [
    { level: 1, name: "初识", min: 0, max: 36 },
    { level: 2, name: "熟悉", min: 36, max: 88 },
    { level: 3, name: "亲近", min: 88, max: 168 },
    { level: 4, name: "信赖", min: 168, max: 280 },
    { level: 5, name: "默契", min: 280, max: 420 }
  ];
  const COMPANION_ADVENTURE_AFFECTION_RANGE = { min: 8, max: 16 };
  const COMPANION_GIFT_AFFECTION_RANGES = {
    "廉价": { min: 4, max: 8 },
    "普通": { min: 8, max: 14 },
    "精良": { min: 14, max: 22 },
    "稀有": { min: 20, max: 30 },
    "史诗": { min: 28, max: 42 }
  };
  const COMPANIONS = [
    {
      id: "mossling",
      name: "苔灯团子",
      spriteType: "monster",
      spriteKind: "mossling",
      portraitScene: "薄雾草甸",
      intro: "住在潮湿角落里的小小精怪，平时会抱着一盏暖黄的苔灯慢吞吞地走路。它不太爱说话，但总会在你路过时悄悄跟上来一段。",
      locationIds: ["misty-meadow", "old-ruins"],
      favoriteGiftIds: ["weapon-potion-bottle", "supply-apple-juice"],
      favoriteGiftId: "weapon-potion-bottle",
      dislikedGiftIds: ["weapon-cross", "supply-cookie"],
      dislikedGiftId: "weapon-cross",
      rewardPool: ["acc-cloak", "acc-leaf-clip", "weapon-staff", "supply-wheat-bread"],
      storyLibrary: [
        "你在{scene}的石缝边看见了{name}，它把怀里的小灯抬高了一点，替你照亮了前面的路。",
        "{name}从潮湿的苔藓后探出头来，确认你不是来打扰安静的人后，才慢吞吞地挪到了你身边。",
        "薄薄的雾气里浮着一点暖色光斑，你走近才发现那是{name}抱着灯坐在石头上。"
      ]
    },
    {
      id: "nora",
      name: "诺拉",
      spriteType: "hero",
      portraitScene: "静默书库",
      appearance: {
        skin: "浅砂",
        hairColor: "蜜糖棕",
        hairStyle: "波波头",
        eyeColor: "深棕",
        eyeStyle: "豆豆眼",
        mouthStyle: "樱桃小嘴-肉粉",
        topColor: "琥珀黄",
        bottomColor: "巧克力棕",
        background: "静默书库",
        topStyle: "短袖"
      },
      intro: "常在书页和街灯之间来回穿梭的抄录员。她习惯把听来的故事记成便签，语气温柔，观察却很敏锐。",
      locationIds: ["quiet-library", "street-corner"],
      favoriteGiftIds: ["acc-wizardhat", "weapon-book", "supply-energy-potion"],
      favoriteGiftId: "acc-wizardhat",
      dislikedGiftIds: ["weapon-axe", "supply-apple-juice"],
      dislikedGiftId: "weapon-axe",
      rewardPool: ["weapon-book", "acc-goggles", "acc-elf-forehead-crown", "supply-cookie"],
      storyLibrary: [
        "你在{scene}撞见了{name}，她正把一张写满批注的纸页折好，顺手也替你记下了今天的见闻。",
        "{name}靠在{scene}的角落里看书，抬头看见你时，像早就知道你会经过这里。",
        "风把一张便签吹到了你脚边，捡起来时你才发现{name}就在不远处朝你挥手。"
      ]
    },
    {
      id: "xingxia",
      name: "星夏",
      spriteType: "hero",
      portraitScene: "潮汐海岸",
      appearance: {
        skin: "焦糖",
        hairColor: "麦金",
        hairStyle: "双麻花辫",
        eyeColor: "天蓝",
        eyeStyle: "大眼",
        mouthStyle: "无嘴",
        topColor: "薄荷绿",
        bottomColor: "薄荷绿",
        background: "潮汐海岸",
        topStyle: "短袖",
        bottomStyle: "短裙",
        accessories: ["小花发夹"]
      },
      intro: "海边出生的旅行者，走到哪儿都带着一点明亮的风。她对新鲜景色总是很好奇，也很擅长把旅途过成节日。",
      locationIds: ["tide-coast", "sakura-lane", "snow-station"],
      favoriteGiftIds: ["acc-star", "supply-cookie"],
      favoriteGiftId: "acc-star",
      dislikedGiftIds: ["acc-helmet", "supply-wheat-bread"],
      dislikedGiftId: "acc-helmet",
      rewardPool: ["bottom-travel", "acc-star", "top-capelet", "supply-energy-potion"],
      storyLibrary: [
        "你在{scene}遇见了{name}，她正蹲在地上挑最好看的贝壳，说这一枚很像今天的天气。",
        "{name}把围巾往肩后一甩，笑着问你这一路有没有捡到什么值得带回去的景色。",
        "刚拐进{scene}，你就听见{name}在哼歌，连风都像跟着她一起轻快了起来。"
      ]
    },
    {
      id: "gandalf",
      name: "甘道夫",
      spriteType: "hero",
      portraitScene: "城堡前庭",
      appearance: {
        skin: "浅砂",
        hairColor: "霜白",
        hairStyle: "大波浪",
        eyeColor: "灰蓝",
        eyeStyle: "困眼",
        mouthStyle: "无嘴",
        topColor: "月影灰",
        bottomColor: "月影灰",
        background: "城堡前庭",
        topStyle: "骑士束衣",
        bottomStyle: "长裙",
        weapon: "水晶法杖",
        weaponRight: "水晶法杖",
        accessories: ["黑色巫师帽"]
      },
      intro: "一个不太爱用魔法的风趣老巫师，嘴上总爱绕几句弯子，但关键时刻比谁都可靠。",
      locationIds: ["quiet-library", "old-ruins", "aurora-edge"],
      favoriteGiftIds: ["weapon-iron-sword", "weapon-wood-shield", "weapon-shield", "supply-cookie"],
      favoriteGiftId: "weapon-iron-sword",
      dislikedGiftIds: ["supply-apple-juice", "weapon-staff", "weapon-ruby-wand"],
      dislikedGiftId: "supply-apple-juice",
      rewardPool: ["weapon-staff", "weapon-book", "acc-black-wizardhat", "supply-holy-water"],
      storyLibrary: [
        "你在{scene}看见了{name}，他正用法杖尖端拨开尘土，像是在确认一条被遗忘很久的路。",
        "{name}站在{scene}的风口，白发和长袍被吹得轻轻晃动，却连目光都没有偏一下，像早就在等你经过。",
        "你刚走进{scene}，就听见{name}低声念完一句咒语，前方原本昏暗的路忽然亮了一点。"
      ]
    },
    {
      id: "zombie",
      name: "Zombie",
      spriteType: "hero",
      portraitScene: "薄雾草甸",
      appearance: {
        skin: "僵尸绿",
        hairColor: "夜棕",
        hairStyle: "碎刘海",
        eyeColor: "墨绿",
        eyeStyle: "空瞳",
        mouthStyle: "小O嘴-深棕",
        topColor: "石板灰",
        bottomColor: "石板灰",
        background: "薄雾草甸",
        topStyle: "背心",
        bottomStyle: "新手下装"
      },
      intro: "一个游荡的迷路僵尸，总是企图吓你但从未成功过。",
      locationIds: ["misty-meadow", "street-corner", "old-ruins"],
      favoriteGiftIds: ["supply-apple-juice", "weapon-axe", "acc-leaf-clip"],
      favoriteGiftId: "supply-apple-juice",
      dislikedGiftIds: ["weapon-cross", "supply-holy-water"],
      dislikedGiftId: "weapon-cross",
      rewardPool: ["top-leather", "bottom-mountain", "acc-scarf-khaki", "supply-cookie"],
      storyLibrary: [
        "你在{scene}遇见了{name}，他正慢吞吞地把掉在地上的小物件一个个捡起来，最后还顺手递给了你。",
        "{name}靠在{scene}的阴影边上发呆，见你走近，只是轻轻抬手打了个招呼，像怕惊动了什么。",
        "风从{scene}吹过去时，{name}把快被卷走的纸片一脚踩住，然后很认真地替你压平了折角。"
      ]
    },
    {
      id: "snowball",
      name: "雪球",
      spriteType: "monster",
      spriteKind: "snowman",
      portraitScene: "落雪驿站",
      intro: "由积雪和一点点亮晶晶的愿望堆成的小雪人怪物，喜欢把闪闪发亮的冰屑藏进身体里。",
      locationIds: ["snow-station", "aurora-edge"],
      favoriteGiftIds: ["acc-star", "supply-cookie"],
      favoriteGiftId: "acc-star",
      dislikedGiftIds: ["acc-scarf", "acc-scarf-cream", "acc-scarf-khaki", "weapon-potion-bottle"],
      dislikedGiftId: "acc-scarf",
      rewardPool: ["acc-star", "top-capelet", "supply-cookie"],
      storyLibrary: [
        "你在{scene}看见了{name}，它正蹲在雪堆边上，把一小片亮晶晶的冰屑当宝物一样藏进肚子里。",
        "{name}在{scene}滚来滚去，把自己滚得更圆了一点，见你看它，还很得意地晃了晃树枝手。",
        "一阵风吹过{scene}，{name}头上的雪差点歪掉，你刚想帮忙，它已经自己努力扶正了。"
      ]
    }
  ];

  // 不同稀有度场景对应的金币掉落范围（含上下界）
  const ADVENTURE_RARITY_GOLD_RANGES = {
    "廉价": { min: 16, max: 32 },
    "普通": { min: 28, max: 52 },
    "精良": { min: 44, max: 82 },
    "稀有": { min: 60, max: 110 },
    "史诗": { min: 88, max: 160 },
  };

  const SHOP_CATALOG = [
    { id: "bg-camp", category: "background", name: "月夜营地", price: 48, description: "每个游戏都会有的深色夜晚背景。", unlockValue: "月夜营地", shopVisible: true, purchaseMode: "gold" },
    { id: "bg-castle", category: "background", name: "城堡前庭", price: 128, description: "城堡准备迎接它的骑士！", unlockValue: "城堡前庭", shopVisible: true, purchaseMode: "gold" },
    { id: "bg-hill", category: "background", name: "黄昏山坡", price: 98, description: "傍晚落日山坡，有点浪漫。", unlockValue: "黄昏山坡", shopVisible: true, purchaseMode: "gold" },
    { id: "bg-misty", category: "background", name: "薄雾草甸", price: 0, description: "清晨的青青草原，空气很清新。", unlockValue: "薄雾草甸", shopVisible: false, purchaseMode: "drop", sourceLocationId: "misty-meadow" },
    { id: "bg-street", category: "background", name: "午后街角", price: 0, description: "适合一个人呆呆坐着看日落的地方。", unlockValue: "午后街角", shopVisible: false, purchaseMode: "drop", sourceLocationId: "street-corner" },
    { id: "bg-library", category: "background", name: "静默书库", price: 0, description: "知识的海洋，适合泡一天。", unlockValue: "静默书库", shopVisible: false, purchaseMode: "drop", sourceLocationId: "quiet-library" },
    { id: "bg-coast", category: "background", name: "潮汐海岸", price: 0, description: "沙滩、海浪、夏日和多巴胺。", unlockValue: "潮汐海岸", shopVisible: false, purchaseMode: "drop", sourceLocationId: "tide-coast" },
    { id: "bg-ruins", category: "background", name: "旧日遗迹", price: 0, description: "断壁残垣后面藏着什么样的故事呢？", unlockValue: "旧日遗迹", shopVisible: false, purchaseMode: "drop", sourceLocationId: "old-ruins" },
    { id: "bg-sakura", category: "background", name: "樱花深巷", price: 0, description: "樱花盛开的地方，适合邂逅美好。", unlockValue: "樱花深巷", shopVisible: false, purchaseMode: "drop", sourceLocationId: "sakura-lane" },
    { id: "bg-snow", category: "background", name: "落雪驿站", price: 0, description: "据说在初雪时候许的愿望更容易实现哦。", unlockValue: "落雪驿站", shopVisible: false, purchaseMode: "drop", sourceLocationId: "snow-station" },
    { id: "bg-aurora", category: "background", name: "极光边境", price: 0, description: "绚烂的夜空诉说着宇宙星河的浪漫。", unlockValue: "极光边境", shopVisible: false, purchaseMode: "drop", sourceLocationId: "aurora-edge" },
    { id: "bg-underwater", category: "background", name: "水下", price: 108, rarity: "普通", description: "额……这里可以呼吸吗？", unlockValue: "水下", shopVisible: true, purchaseMode: "gold" },
    { id: "hair-chinese-bun", category: "hair", name: "中式丸子头", price: 55, description: "传统发型，活泼可爱。", unlockValue: "中式丸子头" },
    { id: "hair-bob", category: "hair", name: "波波头", price: 45, description: "圆润内扣，可爱萌系。", unlockValue: "波波头" },
    { id: "hair-pony", category: "hair", name: "高马尾", price: 65, description: "高束马尾，活力更强。", unlockValue: "高马尾" },
    { id: "hair-bangs", category: "hair", name: "碎刘海", price: 45, description: "侧分碎发，潮男之选。", unlockValue: "碎刘海" },
    { id: "hair-bald", category: "hair", name: "光头", price: 26, description: "极简清爽，也很有勇者感。", unlockValue: "光头", shopVisible: false },
    { id: "hair-bowl", category: "hair", name: "锅盖头", price: 45, description: "规整厚实，乖乖的感觉。", unlockValue: "锅盖头" },
    { id: "hair-spiky", category: "hair", name: "刺头", price: 65, description: "非主流人士的最爱。", unlockValue: "刺头" },
    { id: "hair-bun", category: "hair", name: "丸子头", price: 65, description: "头顶丸子，干练又优雅。", unlockValue: "丸子头" },
    { id: "hair-micro-part", category: "hair", name: "微分碎盖", price: 88, description: "打造氛围感帅哥。", unlockValue: "微分碎盖" },
    { id: "hair-afro", category: "hair", name: "爆炸头", price: 108, description: "很个性的选择，看起来不太好惹。", unlockValue: "爆炸头" },
    { id: "hair-double-bun", category: "hair", name: "双丸子头", price: 75, description: "和高丸子头不一样的风味。", unlockValue: "双丸子头" },
    { id: "hair-wavy-long", category: "hair", name: "大波浪", price: 118, description: "故事里公主的发型。", unlockValue: "大波浪" },
    { id: "hair-long-straight", category: "hair", name: "长直发", price: 85, description: "柔顺长发，看起来很贵气。", unlockValue: "长直发" },
    { id: "hair-braids", category: "hair", name: "双麻花辫", price: 128, description: "双侧长编发，像公主的发型。", unlockValue: "双麻花辫" },
    { id: "hair-side-braid", category: "hair", name: "侧麻花辫", price: 128, description: "单侧前垂编发，可爱又温柔。", unlockValue: "侧麻花辫" },
    { id: "top-adventure", category: "top", name: "冒险外套", price: 38, description: "穿好外套，准备冒险吧！", unlockValue: "冒险外套" },
    { id: "top-knight", category: "top", name: "骑士束衣", price: 58, description: "穿上它，你就是最勇敢的骑士！", unlockValue: "骑士束衣" },
    { id: "top-iron", category: "top", name: "铁甲", price: 128, description: "很坚硬，妈妈再也不怕我会受伤了。", unlockValue: "铁甲" },
    { id: "top-leather", category: "top", name: "皮甲", price: 98, description: "很轻便，像是中世纪游侠的装束。", unlockValue: "皮甲" },
    { id: "top-capelet", category: "top", name: "小斗篷", price: 88, description: "穿上小披风，冒险时也要美美哒。", unlockValue: "小斗篷" },
    { id: "top-vest", category: "top", name: "露肩装", price: 98, description: "露肩设计，有点时尚。", unlockValue: "露肩装" },
    { id: "top-tee", category: "top", name: "短袖", price: 48, description: "夏天必不可少的单品。", unlockValue: "短袖" },
    { id: "top-tank", category: "top", name: "背心", price: 52, description: "细带背心，清爽露肤。", unlockValue: "背心" },
    { id: "top-offshoulder", category: "top", name: "一字肩", price: 78, description: "秀锁骨的时尚之选。", unlockValue: "一字肩" },
    { id: "bottom-travel", category: "bottom", name: "旅行短裤", price: 32, description: "轻快灵活，旅行者的首选。", unlockValue: "旅行短裤" },
    { id: "bottom-mountain", category: "bottom", name: "山路工装", price: 52, description: "更适合长途的硬核冒险。", unlockValue: "山路工装" },
    { id: "bottom-longskirt", category: "bottom", name: "长裙", price: 88, description: "外出冒险，优雅也不能少呀。", unlockValue: "长裙" },
    { id: "bottom-shortskirt", category: "bottom", name: "短裙", price: 88, description: "更轻便的时尚之选。", unlockValue: "短裙" },
    { id: "bottom-greaves", category: "bottom", name: "轻甲护腿", price: 88, description: "战斗的时候少不了它！", unlockValue: "轻甲护腿" },
    { id: "weapon-iron-sword", category: "item", name: "铁剑", price: 88, description: "西幻小说主角人手一把的东西。", unlockValue: "铁剑" },
    { id: "weapon-bow", category: "item", name: "弓箭", price: 88, description: "游侠必备，莱格拉斯力荐！", unlockValue: "弓箭" },
    { id: "weapon-ruby-wand", category: "item", name: "红宝石魔杖", price: 128, description: "暖红宝石发出炽热法光。", unlockValue: "红宝石魔杖" },
    { id: "weapon-emerald-wand", category: "item", name: "绿宝石魔杖", price: 128, description: "墨绿宝石和藤叶装饰更像森林术士。", unlockValue: "绿宝石魔杖" },
    { id: "weapon-amethyst-wand", category: "item", name: "紫水晶魔杖", price: 128, description: "紫晶簇顶端更有夜色施法者气质。", unlockValue: "紫水晶魔杖" },
    { id: "weapon-staff", category: "item", name: "水晶法杖", price: 88, description: "法师必备的基础款。", unlockValue: "水晶法杖" },
    { id: "weapon-spear", category: "item", name: "像素长枪", price: 32, description: "冲锋感更强。", unlockValue: "像素长枪" },
    { id: "weapon-trident", category: "item", name: "三叉戟", price: 149, description: "来自深海的蓝绿色三叉戟。", unlockValue: "三叉戟" },
    { id: "weapon-golden-trident", category: "item", name: "黄金三叉戟", price: 188, description: "海神波塞冬的武器……的饭制版。", unlockValue: "黄金三叉戟" },
    { id: "weapon-pearl-trident", category: "item", name: "白银三叉戟", price: 178, description: "海底下就是宝贝多啊。", unlockValue: "白银三叉戟" },
    { id: "weapon-book", category: "item", name: "魔导书", price: 58, description: "适合专注术士。", unlockValue: "魔导书" },
    { id: "weapon-parchment-book", category: "item", name: "羊皮书", price: 40, rarity: "廉价", description: "不知名小说，书虫必备。", unlockValue: "羊皮书" },
    { id: "weapon-red-book", category: "item", name: "小红书", price: 40, rarity: "廉价", description: "红色的封面，内容不详。", unlockValue: "小红书" },
    { id: "weapon-shield", category: "item", name: "铁盾", price: 105, rarity: "普通", description: "铁边加固的圆盾，扛得住更硬的冲击。", unlockValue: "铁盾", shopVisible: true, purchaseMode: "gold" },
    { id: "weapon-wood-shield", category: "item", name: "木盾", price: 55, rarity: "廉价", description: "轻便木盾，适合刚踏上冒险路的新手。", unlockValue: "木盾", shopVisible: true, purchaseMode: "gold" },
    { id: "weapon-axe", category: "item", name: "斧头", price: 90, rarity: "廉价", description: "伐木与开路两用，抡起来很有踏实感。", unlockValue: "斧头", shopVisible: true, purchaseMode: "gold" },
    { id: "weapon-cross", category: "item", name: "十字架", price: 120, rarity: "普通", description: "随身携带就是感觉安心一些，别问为啥。", unlockValue: "十字架", shopVisible: true, purchaseMode: "gold" },
    { id: "weapon-potion-bottle", category: "item", name: "药水", price: 105, rarity: "普通", description: "可疑但友善的液体。", unlockValue: "药水", shopVisible: true, purchaseMode: "gold" },
    { id: "acc-star", category: "accessory", name: "星星发夹", price: 36, description: "简约的时尚单品。", unlockValue: "星星发夹" },
    { id: "acc-flower-clip", category: "accessory", name: "小花发夹", price: 36, description: "冒险途中捡到的野花。", unlockValue: "小花发夹" },
    { id: "acc-leaf-clip", category: "accessory", name: "叶子发夹", price: 36, description: "富有生机的天然配饰。", unlockValue: "叶子发夹" },
    { id: "acc-goggles", category: "accessory", name: "像素护目镜", price: 42, description: "看起来像探索家。", unlockValue: "像素护目镜" },
    { id: "acc-cloak", category: "accessory", name: "月光披风", price: 68, description: "夜色背景里尤其好看。", unlockValue: "月光披风" },
    { id: "acc-crown", category: "accessory", name: "金色王冠", price: 168, description: "真材实料，用来增加一些主角光环。", unlockValue: "金色王冠" },
    { id: "acc-moon-crown", category: "accessory", name: "月光王冠", price: 158, description: "据说在月光下戴上它，可以召唤独角兽。", unlockValue: "月光王冠" },
    { id: "acc-jungle-crown", category: "accessory", name: "黄铜王冠", price: 128, description: "买不起金银就只好凑活一下咯，也挺好看。", unlockValue: "黄铜王冠" },
    { id: "acc-laurel-crown", category: "accessory", name: "金色桂冠", price: 158, rarity: "精良", description: "金光闪闪，象征胜利与荣耀。", unlockValue: "金色桂冠", shopVisible: true, purchaseMode: "gold" },
    { id: "acc-laurel-green", category: "accessory", name: "桂冠", price: 105, rarity: "普通", description: "金叶子，银叶子，都比不上这顶树叶子。", unlockValue: "桂冠", shopVisible: true, purchaseMode: "gold" },
    { id: "acc-helmet", category: "accessory", name: "头盔", price: 80, rarity: "廉价", description: "道路千万条，安全第一条。", unlockValue: "头盔", shopVisible: true, purchaseMode: "gold" },
    { id: "acc-elf-forehead-crown", category: "accessory", name: "精灵额冠", price: 160, rarity: "精良", description: "银色的冠冕贴着额前，像把林间的安静带在身上。", unlockValue: "精灵额冠", shopVisible: true, purchaseMode: "gold" },
    { id: "acc-scarf", category: "accessory", name: "围巾", price: 44, description: "柔软舒适，保暖必备。", unlockValue: "围巾" },
    { id: "acc-scarf-cream", category: "accessory", name: "奶油围巾", price: 44, description: "温柔的基础款颜色，软乎乎。", unlockValue: "奶油围巾" },
    { id: "acc-scarf-khaki", category: "accessory", name: "秋日围巾", price: 44, description: "棕色的保暖神器，和秋天更配哦。", unlockValue: "秋日围巾" },
    { id: "acc-wizardhat", category: "accessory", name: "法师帽", price: 128, description: "法师的不二之选。", unlockValue: "法师帽" },
    { id: "acc-black-wizardhat", category: "accessory", name: "黑色巫师帽", price: 138, description: "巫师出门的日常之选。", unlockValue: "黑色巫师帽" },
    { id: "supply-apple-juice", category: "supply", name: "苹果汁", price: 22, hp: 18, rarity: "廉价", description: "清甜的果汁，适合口渴来上一杯。", shopVisible: true, purchaseMode: "gold", unlockLevel: 1 },
    { id: "supply-wheat-bread", category: "supply", name: "小麦面包", price: 45, hp: 38, rarity: "普通", description: "烤得松软的小麦面包，妈妈的味道。", shopVisible: true, purchaseMode: "gold", unlockLevel: 1 },
    { id: "supply-energy-potion", category: "supply", name: "能量药水", price: 85, hp: 68, rarity: "精良", description: "蓝色的液体，看起来很厉害的样子。", shopVisible: true, purchaseMode: "gold", unlockLevel: 1 },
    { id: "supply-cookie", category: "supply", name: "巧克力曲奇", price: 50, hp: 50, rarity: "普通", description: "香香脆脆的曲奇，巧克力爱好者的福音。", shopVisible: true, purchaseMode: "gold", unlockLevel: 2 },
    { id: "supply-holy-water", category: "supply", name: "生命圣水", price: 120, hp: 120, rarity: "精良", description: "闪着金光的液体，据说是用精灵领地的泉水制作而成。", shopVisible: true, purchaseMode: "gold", unlockLevel: 7 },
    { id: "egg-chick", category: "petEgg", name: "小鸡蛋", price: 40, description: "可以孵出常见小鸡。", petSpecies: "chick" },
    { id: "egg-slime", category: "petEgg", name: "史莱姆蛋", price: 52, description: "圆滚滚的专注伙伴。", petSpecies: "slime" },
    { id: "egg-fox", category: "petEgg", name: "月狐蛋", price: 88, description: "灵巧的夜行宠物。", petSpecies: "fox" },
    { id: "egg-cat", category: "petEgg", name: "小猫蛋", price: 88, description: "猫猫会一直跟着你。", petSpecies: "cat" },
    { id: "egg-alarm-beast", category: "petEgg", name: "闹钟小兽蛋", price: 0, rarity: "廉价", description: "不可卖，仅可由初次击败拖延巨兽获得。很有时间观念的一个小怪物，是行走的闹钟。", petSpecies: "alarmBeast", shopVisible: false, purchaseMode: "bossDrop", sourceBossId: "delay-giant" },
    { id: "egg-day-ghost", category: "petEgg", name: "白昼幽灵蛋", price: 0, rarity: "普通", description: "不可卖，仅可由初次击败熬夜幽灵获得。它白天出没、晚上睡觉，作息规律。", petSpecies: "dayGhost", shopVisible: false, purchaseMode: "bossDrop", sourceBossId: "night-ghost" },
    { id: "egg-tidy-crow", category: "petEgg", name: "整洁乌鸦蛋", price: 0, rarity: "普通", description: "不可卖，仅可由初次击败混乱乌鸦获得。一只爱干净的白色乌鸦，会主动把乱糟糟的东西整理清爽。", petSpecies: "tidyCrow", shopVisible: false, purchaseMode: "bossDrop", sourceBossId: "chaos-crow" },
  ];
  const MAX_ACCESSORIES = 3;
  const ACCESSORY_PIXEL_MASKS = {
    "星星发夹": [[18, 4, 5, 6]], "小花发夹": [[18, 4, 5, 6]], "叶子发夹": [[18, 4, 5, 6]],
    "金色王冠": [[11, 2, 10, 4]], "月光王冠": [[11, 2, 10, 4]], "黄铜王冠": [[11, 2, 10, 4]],
    "金色桂冠": [[9, 2, 14, 6]],
    "桂冠": [[9, 2, 14, 6]],
    "精灵额冠": [[11, 5, 9, 5]],
    "头盔": [[9, 4, 14, 6]],
    "围巾": [[11, 17, 10, 2], [16, 19, 3, 7]], "奶油围巾": [[11, 17, 10, 2], [16, 19, 3, 7]], "秋日围巾": [[11, 17, 10, 2], [16, 19, 3, 7]],
    "法师帽": [[7, 0, 18, 7]], "黑色巫师帽": [[7, 0, 18, 7]],
    "月光披风": [[9, 16, 14, 12], [10, 16, 3, 12], [19, 16, 3, 12]],
    "像素护目镜": [[11, 10, 10, 3]],
  };
  function rectsOverlap(a, b) {
    return (a[0] < b[0] + b[2]) && (b[0] < a[0] + a[2]) && (a[1] < b[1] + b[3]) && (b[1] < a[1] + a[3]);
  }
  function accessoryOverlapsWithList(accName, list) {
    const rectsA = ACCESSORY_PIXEL_MASKS[accName];
    if (!rectsA || !list.length) return false;
    for (let i = 0; i < list.length; i += 1) {
      const rectsB = ACCESSORY_PIXEL_MASKS[list[i]];
      if (!rectsB) continue;
      for (let r = 0; r < rectsA.length; r += 1) {
        for (let s = 0; s < rectsB.length; s += 1) {
          if (rectsOverlap(rectsA[r], rectsB[s])) return true;
        }
      }
    }
    return false;
  }
  const SHOP_RARITY_OVERRIDES = {
    "bg-castle": "普通",
    "bg-street": "普通",
    "bg-library": "普通",
    "bg-coast": "普通",
    "bg-ruins": "精良",
    "bg-sakura": "精良",
    "bg-snow": "精良",
    "bg-aurora": "稀有",
    "hair-braids": "普通",
    "hair-side-braid": "普通",
    "hair-afro": "普通",
    "hair-wavy-long": "普通",
    "top-iron": "普通",
    "weapon-ruby-wand": "普通",
    "weapon-emerald-wand": "普通",
    "weapon-amethyst-wand": "普通",
    "weapon-trident": "普通",
    "weapon-golden-trident": "精良",
    "weapon-pearl-trident": "精良",
    "acc-wizardhat": "普通",
    "acc-crown": "精良",
    "acc-moon-crown": "精良",
    "acc-black-wizardhat": "普通",
    "acc-jungle-crown": "普通",
    "acc-laurel-crown": "精良",
    "acc-laurel-green": "普通",
    "acc-helmet": "廉价",
    "acc-elf-forehead-crown": "精良",
    "weapon-shield": "普通",
    "weapon-wood-shield": "廉价",
    "weapon-axe": "廉价",
    "weapon-cross": "普通",
    "weapon-potion-bottle": "普通",
    "supply-apple-juice": "廉价",
    "supply-wheat-bread": "普通",
    "supply-energy-potion": "精良",
    "supply-cookie": "普通",
    "supply-holy-water": "精良",
  };
  function legacyCatalogUnlockLevel(item) {
    if (!item || item.purchaseMode === "drop" || item.purchaseMode === "bossDrop") return 1;
    const rarity = itemRarityLabel(item);
    if (rarity === "普通") return 3;
    if (rarity === "精良") return 5;
    if (rarity === "稀有") return 8;
    if (rarity === "史诗") return 10;
    return 1;
  }
  SHOP_CATALOG.forEach(function (item) {
    if (!item) return;
    item.rarity = item.rarity || "廉价";
    if (SHOP_RARITY_OVERRIDES[item.id]) item.rarity = SHOP_RARITY_OVERRIDES[item.id];
    if (!Number.isFinite(Number(item.unlockLevel)) || Number(item.unlockLevel) <= 0) {
      // 现在商店只认商品自身的 unlockLevel；这里给旧商品补一份显式等级，保持原有进度节奏。
      item.unlockLevel = legacyCatalogUnlockLevel(item);
    } else {
      item.unlockLevel = Math.max(1, Math.floor(Number(item.unlockLevel)));
    }
  });

  const DEFAULT_LOGS = [
    "完成了“喝水 8 杯”，获得 12 EXP、8 金币，失去 4 HP，对分心史莱姆造成 18 伤害。",
    "你击败了拖延巨兽，获得 50 金币战利品。",
    "新的 Boss 分心史莱姆出现了。",
    "购买了“黄昏山坡”，并立刻装备上了。",
    "像素小鸡升级到了少年阶段。",
    "你喝下了“苹果汁”，恢复了 18 HP。",
  ];

  function uid(prefix) {
    uidCounter += 1;
    return prefix + "-" + Date.now().toString(36) + "-" + uidCounter.toString(36);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pick(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function catalogItemById(itemId) {
    return SHOP_CATALOG.find(function (entry) { return entry.id === itemId; }) || null;
  }

  function adventureRunCount(locationId) {
    return Math.max(0, Number(state.adventure.locationRuns[locationId]) || 0);
  }

  function adventureBackgroundDropChance(locationId) {
    return clamp(0.12 + adventureRunCount(locationId) * 0.08, 0.12, 0.76);
  }

  function nowStamp(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return month + "/" + day + " " + hours + ":" + minutes;
  }

  function dayKey(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function normalizeTimestamp(value) {
    if (value == null || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  function daysInMonthLocal(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function formatDateTimeLabel(dateValue) {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "无截止日期";
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate()) + " " + pad2(date.getHours()) + ":" + pad2(date.getMinutes());
  }

  function formatDurationWithSeconds(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return days + "天" + hours + "小时" + minutes + "分钟" + secs + "秒";
  }

  function hasTaskDeadline(task) {
    return Boolean(task && task.bucket === "todo" && normalizeTimestamp(task.dueAt) != null);
  }

  function buildTodoDeadlineMeta(task, nowMs) {
    const dueAt = normalizeTimestamp(task && task.dueAt);
    const now = nowMs == null ? Date.now() : nowMs;
    const meta = {
      hasDeadline: dueAt != null,
      dueLabel: dueAt != null ? "截止：" + formatDateTimeLabel(dueAt) : "无截止日期",
      dueTagLabel: dueAt == null ? "无截止日期" : null,
      statusLabel: null,
      statusVariant: "idle"
    };
    if (!task || task.bucket !== "todo") return meta;
    if (task.completed) {
      meta.statusLabel = "已完成";
      meta.statusVariant = "completed";
      return meta;
    }
    if (dueAt == null) return meta;
    const diffMs = dueAt - now;
    if (diffMs > 0) {
      meta.statusLabel = formatDurationWithSeconds(Math.ceil(diffMs / 1000)) + "后截止";
      meta.statusVariant = "countdown";
    } else {
      meta.statusLabel = "已超时" + formatDurationWithSeconds(Math.ceil(Math.abs(diffMs) / 1000));
      meta.statusVariant = "overdue";
    }
    return meta;
  }

  function buildRepeatTaskMeta(task) {
    const count = Math.max(0, Number(task && task.completedCount) || 0);
    return {
      countLabel: "已打卡" + count + "次",
      lastLabel: "上次打卡时间 " + formatRelativeTimeFromNow(task && task.lastCompletedAt, "尚未打卡")
    };
  }

  function hasActiveTodoDeadlineCountdown() {
    return state.tasks.some(function (task) {
      return task.bucket === "todo" && !task.completed && hasTaskDeadline(task);
    });
  }

  function defaultCreateChallengeDueDate() {
    const date = new Date(Date.now() + 60 * 60 * 1000);
    date.setSeconds(0, 0);
    return date;
  }

  function applyCreateChallengeDateSelection(modal, date) {
    modal.deadlineYear = date.getFullYear();
    modal.deadlineMonth = date.getMonth() + 1;
    modal.deadlineDay = date.getDate();
    modal.deadlineCalendarYear = modal.deadlineYear;
    modal.deadlineCalendarMonth = modal.deadlineMonth;
  }

  function ensureCreateChallengeModalDefaults(modal) {
    if (!modal || modal.type !== "createChallenge") return modal;
    const fallback = defaultCreateChallengeDueDate();
    if (typeof modal.title !== "string") modal.title = "";
    if (!TASK_BUCKET_OPTIONS[modal.bucket]) modal.bucket = "todo";
    if (!DIFFICULTIES[modal.difficulty]) modal.difficulty = "normal";
    if (typeof modal.hasDeadline !== "boolean") modal.hasDeadline = false;
    if (!Number.isFinite(Number(modal.deadlineYear))) modal.deadlineYear = fallback.getFullYear();
    if (!Number.isFinite(Number(modal.deadlineMonth))) modal.deadlineMonth = fallback.getMonth() + 1;
    modal.deadlineYear = Math.max(2024, Math.floor(Number(modal.deadlineYear)));
    modal.deadlineMonth = clamp(Math.floor(Number(modal.deadlineMonth)), 1, 12);
    const maxDay = daysInMonthLocal(modal.deadlineYear, modal.deadlineMonth);
    if (!Number.isFinite(Number(modal.deadlineDay))) modal.deadlineDay = fallback.getDate();
    modal.deadlineDay = clamp(Math.floor(Number(modal.deadlineDay)), 1, maxDay);
    if (typeof modal.deadlineHourText !== "string") modal.deadlineHourText = pad2(fallback.getHours());
    if (typeof modal.deadlineMinuteText !== "string") modal.deadlineMinuteText = pad2(fallback.getMinutes());
    modal.deadlineHourText = modal.deadlineHourText.replace(/[^\d]/g, "").slice(0, 2);
    modal.deadlineMinuteText = modal.deadlineMinuteText.replace(/[^\d]/g, "").slice(0, 2);
    if (!Number.isFinite(Number(modal.deadlineCalendarYear))) modal.deadlineCalendarYear = modal.deadlineYear;
    if (!Number.isFinite(Number(modal.deadlineCalendarMonth))) modal.deadlineCalendarMonth = modal.deadlineMonth;
    modal.deadlineCalendarYear = Math.max(2024, Math.floor(Number(modal.deadlineCalendarYear)));
    modal.deadlineCalendarMonth = clamp(Math.floor(Number(modal.deadlineCalendarMonth)), 1, 12);
    return modal;
  }

  function createCreateChallengeModal() {
    const modal = { type: "createChallenge", title: "", bucket: "todo", difficulty: "normal", hasDeadline: false };
    const fallback = defaultCreateChallengeDueDate();
    applyCreateChallengeDateSelection(modal, fallback);
    modal.deadlineHourText = pad2(fallback.getHours());
    modal.deadlineMinuteText = pad2(fallback.getMinutes());
    return modal;
  }

  function parseCreateChallengeTimeText(value, maxValue) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return null;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return null;
    if (numeric < 0 || numeric > maxValue) return null;
    return Math.floor(numeric);
  }

  function resolveCreateChallengeDueAt(modal) {
    ensureCreateChallengeModalDefaults(modal);
    if (modal.bucket !== "todo" || !modal.hasDeadline) return { dueAt: null };
    const hour = parseCreateChallengeTimeText(modal.deadlineHourText, 23);
    if (hour == null) return { error: "请填写 0 到 23 之间的截止小时。" };
    const minute = parseCreateChallengeTimeText(modal.deadlineMinuteText, 59);
    if (minute == null) return { error: "请填写 0 到 59 之间的截止分钟。" };
    const dueAt = new Date(modal.deadlineYear, modal.deadlineMonth - 1, modal.deadlineDay, hour, minute, 0, 0).getTime();
    if (!Number.isFinite(dueAt)) return { error: "请先选择有效的截止日期。" };
    if (dueAt <= Date.now()) return { error: "截止时间需要晚于当前时间。" };
    return { dueAt: dueAt };
  }

  // 图鉴辅助：key = kind + ":" + rawKey
  function codexKey(kind, rawKey) {
    return String(kind || "unknown") + ":" + String(rawKey || "none");
  }

  function codexKindForItemCategory(category) {
    if (category === "background") return "scene";
    if (category === "hair") return "hair";
    if (category === "top") return "top";
    if (category === "bottom") return "bottom";
    if (category === "item") return "gear";
    if (category === "supply") return "supply";
    if (category === "accessory") return "accessory";
    if (category === "petEgg") return "pet";
    return "other";
  }

  function activeCodex() {
    if (!state.codex) state.codex = { items: {}, recentIds: [] };
    if (!Array.isArray(state.codex.recentIds)) state.codex.recentIds = [];
    if (!state.codex.items || typeof state.codex.items !== "object") state.codex.items = {};
    return state.codex;
  }

  function recordCodexRecent(id) {
    const codex = activeCodex();
    codex.recentIds = [id].concat(codex.recentIds.filter(function (value) { return value !== id; }));
    if (codex.recentIds.length > 80) codex.recentIds.length = 80;
  }

  function unlockCodexEntry(kind, rawKey, name, origin) {
    const id = codexKey(kind, rawKey);
    const codex = activeCodex();
    let entry = codex.items[id];
    const nowName = String(name || (entry && entry.name) || "").trim() || "未命名条目";
    const originLabel = typeof origin === "string" && origin.trim() ? origin.trim() : null;
    const firstUnlock = !entry || !entry.unlocked;
    const nowMs = Date.now();
    if (!entry) {
      entry = {
        id: id,
        kind: kind,
        key: rawKey,
        name: nowName,
        unlocked: true,
        unlockedAt: dayKey(),
        unlockedAtMs: nowMs,
        origin: originLabel || (entry && entry.origin) || undefined,
      };
      codex.items[id] = entry;
    } else {
      entry.unlocked = true;
      entry.name = nowName;
      if (!entry.unlockedAt) entry.unlockedAt = dayKey();
      if (firstUnlock) entry.unlockedAtMs = nowMs;
      if (firstUnlock && originLabel) entry.origin = originLabel;
    }
    if (firstUnlock) {
      recordCodexRecent(id);
      setToast("你已解锁“" + nowName + "”的图鉴！", "success");
      const unlockedCount = Object.keys(codex.items).filter(function (key) { return codex.items[key] && codex.items[key].unlocked; }).length;
      if (unlockedCount >= 10) unlockAchievement("collection_codex_10");
      if (unlockedCount >= 20) unlockAchievement("collection_codex_20");
      if (unlockedCount >= 50) unlockAchievement("collection_codex_50");
      if (unlockedCount >= 100) unlockAchievement("collection_codex_100");
    }
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function mergeState(base, saved) {
    if (saved === undefined) {
      return deepClone(base);
    }
    if (Array.isArray(base)) {
      return Array.isArray(saved) ? saved : deepClone(base);
    }
    if (isPlainObject(base)) {
      const output = {};
      const keys = new Set(Object.keys(base).concat(Object.keys(saved || {})));
      keys.forEach(function (key) {
        if (base[key] === undefined) {
          output[key] = saved[key];
          return;
        }
        output[key] = mergeState(base[key], saved ? saved[key] : undefined);
      });
      return output;
    }
    return saved;
  }

  function colorValue(group, name) {
    const list = COLOR_OPTIONS[group];
    for (let i = 0; i < list.length; i += 1) {
      if (list[i][0] === name) {
        return list[i][1];
      }
    }
    return list[0][1];
  }

  function roleSubtitle(level) {
    if (level <= 2) return "新手冒险者";
    if (level <= 4) return "行动练习生";
    if (level <= 6) return "专注骑士";
    return "Boss 终结者";
  }

  function defaultAppearance() {
    return {
      skin: "浅砂",
      hairColor: "麦金",
      hairStyle: "短发",
      eyeColor: "曜石黑",
      eyeStyle: "圆眼",
      mouthStyle: "平口-深棕",
      topColor: "草地绿",
      bottomColor: "深夜蓝",
      background: "草地小径",
      topStyle: "新手上衣",
      bottomStyle: "新手下装",
      weapon: "无",
      weaponLeft: "无",
      weaponRight: "无",
      accessory: "无",
      accessories: [],
    };
  }

  function normalizedCompanionAppearance(appearance) {
    return Object.assign(defaultAppearance(), appearance || {}, {
      accessories: Array.isArray(appearance && appearance.accessories) ? appearance.accessories.slice(0, MAX_ACCESSORIES) : []
    });
  }

  function createDefaultCompanionRecord() {
    return {
      unlocked: false,
      affection: 0,
      meetings: 0,
      lastMetAt: null,
      knownLocationIds: [],
      firstMetLocationId: null,
      firstMetLocationName: null,
      knownFavoriteIds: [],
      knownDislikedIds: [],
      knownFavorite: false,
      knownDislike: false,
    };
  }

  function createInitialCompanionState() {
    const result = {};
    COMPANIONS.forEach(function (companion) {
      result[companion.id] = createDefaultCompanionRecord();
    });
    return result;
  }

  function currentAccessories(appearance) {
    if (!appearance) return [];
    if (Array.isArray(appearance.accessories)) return appearance.accessories;
    if (appearance.accessory === "无" || !appearance.accessory) return [];
    return [appearance.accessory];
  }

  function isShieldWeaponValue(weaponValue) {
    return weaponValue === "铁盾" || weaponValue === "盾牌" || weaponValue === "木盾";
  }

  function weaponHandForValue(weaponValue) {
    if (!weaponValue || weaponValue === "无") return "none";
    return isShieldWeaponValue(weaponValue) ? "left" : "right";
  }

  function createTask(title, bucket, difficulty, completedToday, completed, options) {
    const taskOptions = options || {};
    return {
      id: uid("task"),
      title: title,
      bucket: bucket,
      difficulty: difficulty,
      completedToday: Boolean(completedToday),
      completed: Boolean(completed),
      dueAt: bucket === "todo" ? normalizeTimestamp(taskOptions.dueAt) : null,
      completedCount: Math.max(0, Number(taskOptions.completedCount) || 0),
    };
  }

  function createReward(name, price) {
    return { id: uid("reward"), name: name, price: price };
  }

  function petIncubationMinutesForRarity(rarity) {
    const ranges = {
      "廉价": { min: 15, max: 40 },
      "普通": { min: 35, max: 80 },
      "精良": { min: 70, max: 140 },
      "稀有": { min: 120, max: 320 },
      "史诗": { min: 320, max: 600 },
    };
    const key = ITEM_RARITY_LEVELS.indexOf(rarity || "") >= 0 ? rarity : "廉价";
    const range = ranges[key] || ranges["廉价"];
    return randomInt(range.min, range.max);
  }

  function createPet(species, source, rarity) {
    return {
      id: uid("pet"),
      species: species,
      name: PET_SPECIES[species].name,
      stage: 0,
      source: source,
      rarity: rarity || "廉价",
      isEgg: true,
      displayForm: "egg",
      growth: 0,
      incubationMinutes: petIncubationMinutesForRarity(rarity || "廉价"),
      incubationStartedAt: null,
      incubationEndsAt: null
    };
  }

  function createDefaultState() {
    const logs = DEFAULT_LOGS.map(function (message, index) {
      return { id: uid("log"), message: message, stamp: nowStamp(Date.now() - index * 16 * 60 * 1000) };
    });
    return {
      page: "tasks",
      tasksTab: "challenge",
      shopCategory: "all",
      socialTab: SOCIAL_TABS.pets,
      composer: {
        taskTitle: "",
        taskBucket: "todo",
        taskDifficulty: "normal",
        rewardName: "",
        rewardPrice: "20",
      },
      profile: {
        level: 1,
        exp: 0,
        expToNext: 100,
        maxHp: 100,
        hp: 100,
        gold: 0,
        streak: 0,
        totalStreakDays: 0,
        done: 0,
        name: HERO_ROLE,
        appearance: defaultAppearance(),
      },
      collection: {
        backgrounds: ["草地小径"],
        hairStyles: ["短发", "光头"],
        topStyles: ["新手上衣"],
        bottomStyles: ["新手下装"],
        weapons: ["无", "木剑"],
        accessories: ["无"],
      },
      showCompletedTodo: true,
      todoSortMode: "default",
      journalHistoryMonthOffset: 0,
      tasks: [
        createTask("整理桌面", "todo", "easy", false, false),
        createTask("喝水 8 杯", "habit", "easy", false, false),
        createTask("学习 25 分钟", "learn", "normal", false, false)
      ],
      rewards: [createReward("喝奶茶", 17), createReward("看一集喜欢的剧", 30), createReward("喝一杯喜欢的饮料", 25)],
      supplies: {},
      pets: [],
      currentPetId: null,
      companions: createInitialCompanionState(),
      selectedCompanionId: COMPANIONS[0] ? COMPANIONS[0].id : null,
      bossIndex: 0,
      boss: { id: BOSS_ROTATION[0].id, hp: BOSS_ROTATION[0].maxHp, maxHp: BOSS_ROTATION[0].maxHp },
      bossDeadlineAt: null,
      adventure: { slots: 54, maxSlots: 120, activeTrip: null, locationRuns: {} },
      todayStats: { dayKey: dayKey(), exp: 0, done: 0, pomo: 0, goldIn: 0, goldOut: 0, trips: 0 },
      historyStats: {},
      todaySignedIn: false,
      totalSignInDays: 0,
      totalCompletedTasks: 0,
      totalCompletedTrips: 0,
      totalCompletedMinigames: 0,
      totalBossDefeated: 0,
      shopPurchases: 0,
      exportCount: 0,
      /** 最近一次成功导出存档的时间戳（ms），用于设置页显示「多久前导出」 */
      lastExportAt: null,
      importCount: 0,
      /** 最近一次已处理「每日导出提醒」的日期（YYYY-MM-DD），与 dayKey() 一致；null 表示尚未记录 */
      lastExportReminderDay: null,
      resetCount: 0,
      totalLogEntries: logs.length,
      hatchedPetCount: 0,
      totalCompanionGiftsSent: 0,
      achievements: { unlocked: {}, recentIds: [] },
      lastCompletionDay: dayKey(),
      lastTodoCompletedAt: null,
      challengeMode: false,
      pureMode: false,
      logs: logs,
      modal: null,
      toast: null,
      nextToast: null,
      pendingMoodAfterChest: null,
      uiTheme: DEFAULT_UI_THEME,
      codex: { items: {}, recentIds: [] },
      migrations: { hairRenameV2: true },
    };
  }

  function syncThemeStyles() {
    BUTTON_VARIANTS.paper.fill = THEME.paper;
    BUTTON_VARIANTS.paper.text = THEME.ink;
    BUTTON_VARIANTS.pager.fill = THEME.frameLight;
    BUTTON_VARIANTS.pager.shadow = THEME.frameDark;
    BUTTON_VARIANTS.pager.text = THEME.ink;
    BUTTON_VARIANTS.pagerDisabled.fill = THEME.paperMuted;
    BUTTON_VARIANTS.pagerDisabled.shadow = THEME.frame;
    BUTTON_VARIANTS.pagerDisabled.text = THEME.inkSoft;
    document.body.style.background = THEME.sky;
    hiddenInput.style.background = THEME.paper;
    hiddenInput.style.color = THEME.ink;
    hiddenInput.style.caretColor = THEME.ink;
  }

  function applyUiTheme(themeId) {
    const palette = UI_THEME_PRESETS[themeId] || UI_THEME_PRESETS[DEFAULT_UI_THEME];
    ["sky", "skyGlow", "ground", "groundDark", "frameLight", "frame", "frameDark", "paper", "paperSoft", "paperMuted", "overlayShade", "cloudA", "cloudB", "headerShadow", "toastBg"].forEach(function (key) {
      THEME[key] = palette[key];
    });
    syncThemeStyles();
  }

  function setUiTheme(themeId) {
    if (!UI_THEME_PRESETS[themeId] || state.uiTheme === themeId) return;
    state.uiTheme = themeId;
    applyUiTheme(themeId);
    unlockAchievement("misc_theme_switch");
    saveState();
    renderApp();
  }

  function addLog(message, targetState) {
    const outputState = targetState || state;
    outputState.logs.unshift({ id: uid("log"), message: message, stamp: nowStamp() });
    outputState.logs = outputState.logs.slice(0, 24);
    if (outputState === state) {
      state.totalLogEntries = (state.totalLogEntries || 0) + 1;
      if ((state.totalLogEntries || 0) >= 20) unlockAchievement("misc_logs_20");
    }
  }

  function maybeResetDailyState(targetState) {
    if (targetState.todayStats.dayKey === dayKey()) return false;
    targetState.todayStats = { dayKey: dayKey(), exp: 0, done: 0, pomo: 0, goldIn: 0, goldOut: 0, trips: 0 };
    targetState.todaySignedIn = false;
    targetState.tasks.forEach(function (task) {
      if (task.bucket === "habit" || task.bucket === "learn") task.completedToday = false;
    });
    addLog("新的一天开始了，任务状态已刷新。", targetState);
    return true;
  }

  function ensureHistoryDay(dayKeyValue, targetState) {
    const s = targetState || state;
    if (!s.historyStats) s.historyStats = {};
    if (!s.historyStats[dayKeyValue]) s.historyStats[dayKeyValue] = { exp: 0, done: 0 };
    return s.historyStats[dayKeyValue];
  }

  function normalizeState(input) {
    const stateValue = input;
    const validBackgrounds = Object.keys(SCENE_THEMES);
    const defaultBackground = validBackgrounds[0] || "\u8349\u5730\u5c0f\u5f84";
    if (!BOSS_ROTATION[stateValue.bossIndex]) stateValue.bossIndex = 0;
    const bossTemplate = BOSS_ROTATION[stateValue.bossIndex];
    if (!stateValue.boss || !stateValue.boss.id) {
      stateValue.boss = { id: bossTemplate.id, hp: bossTemplate.maxHp, maxHp: bossTemplate.maxHp };
    } else {
      // 同步已有存档中的 Boss 血量上限到最新配置
      if (stateValue.boss.id !== bossTemplate.id) stateValue.boss.id = bossTemplate.id;
      stateValue.boss.maxHp = bossTemplate.maxHp;
      const currentHp = Number(stateValue.boss.hp);
      stateValue.boss.hp = Number.isFinite(currentHp) ? clamp(currentHp, 0, bossTemplate.maxHp) : bossTemplate.maxHp;
    }
    if (stateValue.bossDeadlineAt == null) {
      stateValue.bossDeadlineAt = bossTemplate && bossTemplate.timeLimitHours ? Date.now() + bossTemplate.timeLimitHours * 3600000 : null;
    }
    if (!stateValue.profile.name) stateValue.profile.name = HERO_ROLE;
    if (!stateValue.profile.appearance.topStyle) stateValue.profile.appearance.topStyle = "新手上衣";
    if (!stateValue.migrations) stateValue.migrations = {};
    if (stateValue.tasksTab !== "challenge" && stateValue.tasksTab !== "rest") stateValue.tasksTab = "challenge";
    if (stateValue.socialTab !== SOCIAL_TABS.pets && stateValue.socialTab !== SOCIAL_TABS.companions) stateValue.socialTab = SOCIAL_TABS.pets;
    // 统一默认系统配色：首次迁移时将旧默认“温暖落日”改为“传统原木”
    if (!stateValue.migrations.themeDefaultWoodV1) {
      if (stateValue.uiTheme === "sunset" || !UI_THEME_PRESETS[stateValue.uiTheme]) {
        stateValue.uiTheme = DEFAULT_UI_THEME;
      }
      stateValue.migrations.themeDefaultWoodV1 = true;
    }
    if (typeof stateValue.challengeMode !== "boolean") stateValue.challengeMode = false;
    if (typeof stateValue.pureMode !== "boolean") stateValue.pureMode = false;
    if (stateValue.lastTodoCompletedAt == null || !Number.isFinite(Number(stateValue.lastTodoCompletedAt))) stateValue.lastTodoCompletedAt = null;

    // 旧存档迁移：修复连续打卡（streak）误判，按 historyStats 的 done 重新计算
    if (!stateValue.migrations.streakRecalcV1) {
      function parseDayKeyLocalNoon(key) {
        const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d0 = Number(m[3]);
        if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d0)) return null;
        return new Date(y, mo - 1, d0, 12, 0, 0, 0);
      }
      function shiftDayKey(baseKey, deltaDays) {
        const baseDate = parseDayKeyLocalNoon(baseKey);
        if (!baseDate) return null;
        baseDate.setDate(baseDate.getDate() + deltaDays);
        return dayKey(baseDate);
      }
      const stats = stateValue.historyStats && typeof stateValue.historyStats === "object" ? stateValue.historyStats : {};
      const todayKey0 = dayKey();
      // 以“今天优先，其次昨天”为结尾来计算 streak
      const hasToday = stats[todayKey0] && Number(stats[todayKey0].done) > 0;
      const yesterdayKey0 = shiftDayKey(todayKey0, -1);
      const hasYesterday = yesterdayKey0 && stats[yesterdayKey0] && Number(stats[yesterdayKey0].done) > 0;
      let startKey = hasToday ? todayKey0 : (hasYesterday ? yesterdayKey0 : null);
      let streak = 0;
      if (startKey) {
        for (let i = 0; i < 366; i += 1) {
          const key = shiftDayKey(startKey, -i);
          if (!key) break;
          const entry = stats[key];
          if (!entry || Number(entry.done) <= 0) break;
          streak += 1;
        }
      }
      if (!stateValue.profile) stateValue.profile = {};
      if (!Number.isFinite(Number(stateValue.profile.streak))) stateValue.profile.streak = 0;
      if (streak > 0) {
        stateValue.profile.streak = streak;
        stateValue.lastCompletionDay = startKey;
      } else if (!stateValue.lastCompletionDay) {
        stateValue.lastCompletionDay = todayKey0;
      }
      stateValue.migrations.streakRecalcV1 = true;
    }
    if (!stateValue.migrations.hairRenameV2) {
      if (stateValue.profile.appearance.hairStyle === "刺头") stateValue.profile.appearance.hairStyle = "锅盖头";
      if (stateValue.collection && Array.isArray(stateValue.collection.hairStyles)) {
        stateValue.collection.hairStyles = stateValue.collection.hairStyles.map(function (value) {
          return value === "刺头" ? "锅盖头" : value;
        });
      }
      stateValue.migrations.hairRenameV2 = true;
    }
    if (!stateValue.migrations.crownRenameV1) {
      const collAcc = stateValue.collection && Array.isArray(stateValue.collection.accessories) ? stateValue.collection.accessories : null;
      if (collAcc) {
        stateValue.collection.accessories = collAcc.map(function (v) {
          if (v === "王冠") return "金色王冠";
          if (v === "丛林王冠") return "黄铜王冠";
          return v;
        });
      }
      const ap = stateValue.profile && stateValue.profile.appearance ? stateValue.profile.appearance : null;
      if (ap) {
        if (ap.accessory === "王冠") ap.accessory = "金色王冠";
        if (ap.accessory === "丛林王冠") ap.accessory = "黄铜王冠";
        if (Array.isArray(ap.accessories)) {
          ap.accessories = ap.accessories.map(function (v) {
            if (v === "王冠") return "金色王冠";
            if (v === "丛林王冠") return "黄铜王冠";
            return v;
          });
        }
      }
      stateValue.migrations.crownRenameV1 = true;
    }
    // 旧存档迁移：把原先的“桂冠”（现在重命名为“金色桂冠”）
    if (!stateValue.migrations.laurelRenameV1) {
      const oldAcc = "桂冠";
      const newAcc = "金色桂冠";
      if (stateValue.collection && Array.isArray(stateValue.collection.accessories)) {
        stateValue.collection.accessories = stateValue.collection.accessories.map(function (v) {
          return v === oldAcc ? newAcc : v;
        });
      }
      const ap = stateValue.profile && stateValue.profile.appearance ? stateValue.profile.appearance : null;
      if (ap) {
        if (ap.accessory === oldAcc) ap.accessory = newAcc;
        if (Array.isArray(ap.accessories)) {
          ap.accessories = ap.accessories.map(function (v) {
            return v === oldAcc ? newAcc : v;
          });
        }
      }
      // 图鉴条目 key/ID 也一起迁移（accessory:桂冠 -> accessory:金色桂冠）
      if (stateValue.codex && stateValue.codex.items && typeof stateValue.codex.items === "object") {
        const oldId = "accessory:" + oldAcc;
        const newId = "accessory:" + newAcc;
        if (stateValue.codex.items[oldId]) {
          stateValue.codex.items[newId] = stateValue.codex.items[newId] || stateValue.codex.items[oldId];
          stateValue.codex.items[newId].id = newId;
          stateValue.codex.items[newId].key = newAcc;
          stateValue.codex.items[newId].name = "金色桂冠";
          delete stateValue.codex.items[oldId];
        }
      }
      if (stateValue.codex && Array.isArray(stateValue.codex.recentIds)) {
        stateValue.codex.recentIds = stateValue.codex.recentIds.map(function (id) {
          return id === "accessory:" + oldAcc ? "accessory:" + newAcc : id;
        });
      }
      if (stateValue.modal && stateValue.modal.type === "codex" && stateValue.modal.selectedId === "accessory:" + oldAcc) {
        stateValue.modal.selectedId = "accessory:" + newAcc;
      }
      stateValue.migrations.laurelRenameV1 = true;
    }
    if (!stateValue.migrations.topVestRenameV1) {
      if (stateValue.profile.appearance.topStyle === "小背心") stateValue.profile.appearance.topStyle = "露肩装";
      if (stateValue.collection && Array.isArray(stateValue.collection.topStyles)) {
        stateValue.collection.topStyles = stateValue.collection.topStyles.map(function (value) {
          return value === "小背心" ? "露肩装" : value;
        });
      }
      stateValue.migrations.topVestRenameV1 = true;
    }
    // 旧存档补齐「光头」发型到已拥有列表
    if (!stateValue.migrations.hairBaldInitV1) {
      if (!stateValue.collection) stateValue.collection = {};
      if (!Array.isArray(stateValue.collection.hairStyles)) stateValue.collection.hairStyles = [];
      if (stateValue.collection.hairStyles.indexOf("光头") < 0) {
        stateValue.collection.hairStyles.push("光头");
      }
      stateValue.migrations.hairBaldInitV1 = true;
    }
    // 图鉴去重：早期用“光头”作为 key 的初始条目会导致出现两条“光头”
    // 统一保留真实物品条目 hair:hair-bald（由 SHOP_CATALOG 生成），删除 hair:光头。
    if (!stateValue.migrations.codexBaldDedupV1) {
      const dupId = "hair:光头";
      if (stateValue.codex && stateValue.codex.items && stateValue.codex.items[dupId]) {
        delete stateValue.codex.items[dupId];
      }
      if (stateValue.codex && Array.isArray(stateValue.codex.recentIds)) {
        stateValue.codex.recentIds = stateValue.codex.recentIds.filter(function (id) { return id !== dupId; });
      }
      if (stateValue.modal && stateValue.modal.type === "codex" && stateValue.modal.selectedId === dupId) {
        stateValue.modal.selectedId = null;
      }
      stateValue.migrations.codexBaldDedupV1 = true;
    }
    // 旧存档补齐：宠物孵化（幼年 stage=0）未写入图鉴时，自动补录幼年条目
    if (!stateValue.migrations.codexPetStage0V1) {
      if (!stateValue.codex) stateValue.codex = { items: {}, recentIds: [] };
      if (!stateValue.codex.items || typeof stateValue.codex.items !== "object") stateValue.codex.items = {};
      const day = stateValue.lastCompletionDay || dayKey();
      (stateValue.pets || []).forEach(function (pet) {
        if (!pet || pet.isEgg || !PET_SPECIES[pet.species]) return;
        const id = codexKey("pet", pet.species + ":0");
        if (!stateValue.codex.items[id]) {
          const speciesName = PET_SPECIES[pet.species].name;
          stateValue.codex.items[id] = { id: id, kind: "pet", key: pet.species + ":0", name: speciesName + "·" + PET_STAGES[0], unlocked: true, unlockedAt: day };
        } else if (!stateValue.codex.items[id].unlocked) {
          stateValue.codex.items[id].unlocked = true;
        }
      });
      stateValue.migrations.codexPetStage0V1 = true;
    }
    if (!Number.isFinite(Number(stateValue.shopPage))) stateValue.shopPage = 0;
    if (!stateValue.supplies || typeof stateValue.supplies !== "object" || Array.isArray(stateValue.supplies)) stateValue.supplies = {};
    Object.keys(stateValue.supplies).forEach(function (itemId) {
      const item = catalogItemById(itemId);
      const count = Math.max(0, Math.floor(Number(stateValue.supplies[itemId]) || 0));
      if (!item || !isSupplyItem(item) || count <= 0) delete stateValue.supplies[itemId];
      else stateValue.supplies[itemId] = count;
    });
    if (!stateValue.profile.appearance.hairStyle || HAIR_STYLES.indexOf(stateValue.profile.appearance.hairStyle) < 0) stateValue.profile.appearance.hairStyle = "短发";
    if (!stateValue.profile.appearance.eyeColor) stateValue.profile.appearance.eyeColor = "曜石黑";
    if (!Array.isArray(stateValue.profile.appearance.accessories)) {
      const single = stateValue.profile.appearance.accessory;
      stateValue.profile.appearance.accessories = (single === "无" || !single) ? [] : [single];
    }
    if (stateValue.profile.appearance.accessories.length > MAX_ACCESSORIES) {
      stateValue.profile.appearance.accessories = stateValue.profile.appearance.accessories.slice(0, MAX_ACCESSORIES);
    }
    if (stateValue.profile.appearance.eyeStyle === "微笑眯眼") stateValue.profile.appearance.eyeStyle = "微笑眼";
    if (stateValue.profile.appearance.eyeStyle === "下垂眼") stateValue.profile.appearance.eyeStyle = "瞪眼";
    if (!stateValue.historyStats) stateValue.historyStats = {};
    if (stateValue.todaySignedIn == null) stateValue.todaySignedIn = false;
    if (stateValue.totalSignInDays == null) stateValue.totalSignInDays = 0;
    if (stateValue.totalCompletedTasks == null) stateValue.totalCompletedTasks = 0;
    if (stateValue.totalCompletedTrips == null) stateValue.totalCompletedTrips = 0;
    if (stateValue.shopPurchases == null) stateValue.shopPurchases = 0;
    if (stateValue.exportCount == null) stateValue.exportCount = 0;
    if (stateValue.lastExportAt != null && !Number.isFinite(Number(stateValue.lastExportAt))) stateValue.lastExportAt = null;
    if (stateValue.importCount == null) stateValue.importCount = 0;
    if (stateValue.resetCount == null) stateValue.resetCount = 0;
    if (stateValue.totalLogEntries == null) stateValue.totalLogEntries = (stateValue.logs || []).length;
    if (stateValue.hatchedPetCount == null) stateValue.hatchedPetCount = 0;
    const companionGiftLogCount = Array.isArray(stateValue.logs)
      ? stateValue.logs.filter(function (entry) {
        return entry && typeof entry.message === "string" && /你给“.+”送出了“.+”/.test(entry.message);
      }).length
      : 0;
    stateValue.totalCompanionGiftsSent = Math.max(0, Math.max(Number(stateValue.totalCompanionGiftsSent) || 0, companionGiftLogCount));
    if (stateValue.profile.totalStreakDays == null) stateValue.profile.totalStreakDays = 0;
    if (!stateValue.achievements || typeof stateValue.achievements !== "object") stateValue.achievements = { unlocked: {}, recentIds: [] };
    if (!stateValue.achievements.unlocked) stateValue.achievements.unlocked = {};
    if (!Array.isArray(stateValue.achievements.recentIds)) stateValue.achievements.recentIds = [];
    Object.keys(stateValue.achievements.unlocked).forEach(function (id) {
      const info = stateValue.achievements.unlocked[id];
      if (!info || typeof info !== "object") {
        stateValue.achievements.unlocked[id] = { unlockedAt: Date.now(), claimed: false };
      } else if (info.claimed == null) {
        info.claimed = false;
      }
    });
    if (!stateValue.profile.appearance.eyeStyle || EYE_STYLES.indexOf(stateValue.profile.appearance.eyeStyle) < 0) {
      if (stateValue.profile.appearance.expression === "开心") stateValue.profile.appearance.eyeStyle = "亮眼";
      else if (stateValue.profile.appearance.expression === "冷静") stateValue.profile.appearance.eyeStyle = "眯眼";
      else if (stateValue.profile.appearance.expression === "困困") stateValue.profile.appearance.eyeStyle = "困眼";
      else stateValue.profile.appearance.eyeStyle = "圆眼";
    }
    var _m = stateValue.profile.appearance.mouthStyle;
    if (_m === "平口" || _m === "微笑" || _m === "小O嘴" || _m === "抿嘴") {
      stateValue.profile.appearance.mouthStyle = (_m === "微笑" ? "樱桃小嘴" : _m === "抿嘴" ? "微笑" : _m) + "-深棕";
    } else if (_m === "大笑") {
      stateValue.profile.appearance.mouthStyle = "樱桃小嘴-深棕";
    } else if (typeof _m === "string" && _m.indexOf("微笑-") === 0) {
      stateValue.profile.appearance.mouthStyle = "樱桃小嘴-" + _m.slice(3);
    } else if (typeof _m === "string" && _m.indexOf("大笑-") === 0) {
      stateValue.profile.appearance.mouthStyle = "樱桃小嘴-" + _m.slice(3);
    } else if (typeof _m === "string" && _m.indexOf("抿嘴-") === 0) {
      stateValue.profile.appearance.mouthStyle = "微笑-" + _m.slice(3);
    }
    if (!stateValue.profile.appearance.mouthStyle || MOUTH_STYLES.indexOf(stateValue.profile.appearance.mouthStyle) < 0) {
      if (stateValue.profile.appearance.expression === "开心") stateValue.profile.appearance.mouthStyle = "樱桃小嘴-深棕";
      else if (stateValue.profile.appearance.expression === "困困") stateValue.profile.appearance.mouthStyle = "微笑-深棕";
      else stateValue.profile.appearance.mouthStyle = "平口-深棕";
    }
    if (!stateValue.collection.backgrounds || !stateValue.collection.backgrounds.length) stateValue.collection.backgrounds = [defaultBackground];
    if (!stateValue.profile.appearance.background || validBackgrounds.indexOf(stateValue.profile.appearance.background) < 0) stateValue.profile.appearance.background = defaultBackground;
    stateValue.collection.backgrounds = Array.from(new Set(stateValue.collection.backgrounds.filter(function (value) {
      return validBackgrounds.indexOf(value) >= 0;
    }).concat([stateValue.profile.appearance.background])));
    if (!stateValue.collection.hairStyles || !stateValue.collection.hairStyles.length) stateValue.collection.hairStyles = ["短发"];
    stateValue.collection.hairStyles = Array.from(new Set(stateValue.collection.hairStyles.filter(function (value) {
      return HAIR_STYLES.indexOf(value) >= 0;
    }).concat([stateValue.profile.appearance.hairStyle])));
    if (!stateValue.collection.topStyles || !stateValue.collection.topStyles.length) stateValue.collection.topStyles = ["新手上衣"];
    stateValue.collection.topStyles = Array.from(new Set(stateValue.collection.topStyles.filter(function (value) {
      return TOP_STYLES.indexOf(value) >= 0;
    }).concat([stateValue.profile.appearance.topStyle])));
    if (!stateValue.collection.bottomStyles || !stateValue.collection.bottomStyles.length) stateValue.collection.bottomStyles = ["新手下装"];
    stateValue.collection.bottomStyles = Array.from(new Set(stateValue.collection.bottomStyles.filter(function (value) {
      return BOTTOM_STYLES.indexOf(value) >= 0;
    }).concat([stateValue.profile.appearance.bottomStyle])));
    if (!stateValue.collection.weapons || !stateValue.collection.weapons.length) stateValue.collection.weapons = ["无", "木剑"];
    else if (stateValue.collection.weapons.indexOf("无") < 0) stateValue.collection.weapons.unshift("无");
    if (!stateValue.profile.appearance.weapon || stateValue.collection.weapons.indexOf(stateValue.profile.appearance.weapon) < 0) stateValue.profile.appearance.weapon = "无";
    if (!stateValue.profile.appearance.weaponLeft) stateValue.profile.appearance.weaponLeft = "无";
    if (!stateValue.profile.appearance.weaponRight) stateValue.profile.appearance.weaponRight = "无";
    const legacyWeapon0 = stateValue.profile.appearance.weapon;
    if ((!stateValue.profile.appearance.weaponLeft || stateValue.profile.appearance.weaponLeft === "无") && isShieldWeaponValue(legacyWeapon0)) {
      stateValue.profile.appearance.weaponLeft = legacyWeapon0;
    }
    if ((!stateValue.profile.appearance.weaponRight || stateValue.profile.appearance.weaponRight === "无") && legacyWeapon0 !== "无" && !isShieldWeaponValue(legacyWeapon0)) {
      stateValue.profile.appearance.weaponRight = legacyWeapon0;
    }
    if (stateValue.collection.weapons.indexOf(stateValue.profile.appearance.weaponLeft) < 0) stateValue.profile.appearance.weaponLeft = "无";
    if (stateValue.collection.weapons.indexOf(stateValue.profile.appearance.weaponRight) < 0) stateValue.profile.appearance.weaponRight = "无";
    if (isShieldWeaponValue(stateValue.profile.appearance.weaponRight)) {
      stateValue.profile.appearance.weaponLeft = stateValue.profile.appearance.weaponRight;
      stateValue.profile.appearance.weaponRight = "无";
    }
    stateValue.profile.appearance.weapon = stateValue.profile.appearance.weaponRight || "无";
    if (!stateValue.codex || typeof stateValue.codex !== "object") stateValue.codex = { items: {}, recentIds: [] };
    if (!Array.isArray(stateValue.codex.recentIds)) stateValue.codex.recentIds = [];
    if (!stateValue.codex.items || typeof stateValue.codex.items !== "object") stateValue.codex.items = {};
    // 初始图鉴条目：强制 upsert，确保任何存档都能正确显示（不包含“无”）
    (function () {
      const codex0 = stateValue.codex;
      INITIAL_CODEX_ITEMS.forEach(function (entry) {
        const id = codexKey(entry.kind, entry.key);
        codex0.items[id] = Object.assign({}, codex0.items[id] || {}, {
          id: id,
          kind: entry.kind,
          key: entry.key,
          name: entry.name,
          unlocked: true,
          // 用于排序的时间戳/日期可以保留，但展示时会用“初始获得”
          unlockedAt: (codex0.items[id] && codex0.items[id].unlockedAt) ? codex0.items[id].unlockedAt : (stateValue.lastCompletionDay || dayKey()),
          origin: "initial",
          description: entry.desc || ((codex0.items[id] && codex0.items[id].description) || ""),
          rarity: entry.rarity || ((codex0.items[id] && codex0.items[id].rarity) || "廉价"),
        });
      });
    })();
    // 兼容旧存档：如果还没做过 codex 初始化，则根据已有数据补录已解锁条目，并填入 recentIds
    if (!stateValue.migrations.codexInitV1) {
      const codex = stateValue.codex;
      const backfillIds = [];
      SHOP_CATALOG.forEach(function (item) {
        if (!item) return;
        const owned = stateValue.collection && COLLECTION_KEYS[item.category] ? stateValue.collection[COLLECTION_KEYS[item.category]] || [] : [];
        const isOwned = item.category === "petEgg"
          ? (stateValue.pets || []).some(function (pet) { return pet && pet.species === item.petSpecies; })
          : isSupplyItem(item)
            ? supplyCount(item.id, stateValue) > 0
            : Array.isArray(owned) && owned.indexOf(item.unlockValue) >= 0;
        if (isOwned) {
          const id = codexKey(codexKindForItemCategory(item.category), item.id);
          if (!codex.items[id]) {
            codex.items[id] = { id: id, kind: codexKindForItemCategory(item.category), key: item.id, name: item.name, unlocked: true, unlockedAt: stateValue.lastCompletionDay || dayKey() };
            backfillIds.push(id);
          }
        }
      });
      (stateValue.pets || []).forEach(function (pet) {
        if (!pet || !PET_SPECIES[pet.species]) return;
        const speciesName = PET_SPECIES[pet.species].name;
        const maxStage = pet.isEgg ? -1 : clamp(Number(pet.stage) || 0, 0, PET_STAGES.length - 1);
        for (let s = 0; s <= maxStage; s += 1) {
          const id = codexKey("pet", pet.species + ":" + s);
          if (!codex.items[id]) {
            codex.items[id] = { id: id, kind: "pet", key: pet.species + ":" + s, name: speciesName + "·" + PET_STAGES[s], unlocked: true, unlockedAt: stateValue.lastCompletionDay || dayKey() };
            backfillIds.push(id);
          }
        }
      });
      const bossTemplateInit = BOSS_ROTATION[stateValue.bossIndex] || BOSS_ROTATION[0];
      if (bossTemplateInit) {
        const bossId = codexKey("boss", bossTemplateInit.id);
        if (!stateValue.codex.items[bossId]) {
          stateValue.codex.items[bossId] = { id: bossId, kind: "boss", key: bossTemplateInit.id, name: bossTemplateInit.name, unlocked: true, unlockedAt: stateValue.lastCompletionDay || dayKey() };
          backfillIds.push(bossId);
        }
      }
      codex.recentIds = backfillIds.slice(0, 80).concat(codex.recentIds.filter(function (id) { return backfillIds.indexOf(id) < 0; }));
      if (codex.recentIds.length > 80) codex.recentIds.length = 80;
      stateValue.migrations.codexInitV1 = true;
    }
    // 二次兼容：若 codexInitV1 已标为完成但 recentIds 仍为空（之前因 default 带了 codexInitV1 导致迁移未执行），补跑一次
    if (stateValue.migrations.codexInitV1 && !stateValue.migrations.codexInitV2) {
      const codex2 = stateValue.codex;
      const hasContent = (stateValue.collection && (Object.keys(stateValue.collection).some(function (k) { const arr = stateValue.collection[k]; return Array.isArray(arr) && arr.length > 1; }))) || (Array.isArray(stateValue.pets) && stateValue.pets.length > 0);
      if (hasContent && (!codex2.recentIds || codex2.recentIds.length === 0)) {
        const backfillIds2 = [];
        SHOP_CATALOG.forEach(function (item) {
          if (!item) return;
          const owned = stateValue.collection && COLLECTION_KEYS[item.category] ? stateValue.collection[COLLECTION_KEYS[item.category]] || [] : [];
          const isOwned = item.category === "petEgg"
            ? (stateValue.pets || []).some(function (pet) { return pet && pet.species === item.petSpecies; })
            : isSupplyItem(item)
              ? supplyCount(item.id, stateValue) > 0
              : Array.isArray(owned) && owned.indexOf(item.unlockValue) >= 0;
          if (isOwned) {
            const id = codexKey(codexKindForItemCategory(item.category), item.id);
            if (!codex2.items[id]) {
              codex2.items[id] = { id: id, kind: codexKindForItemCategory(item.category), key: item.id, name: item.name, unlocked: true, unlockedAt: stateValue.lastCompletionDay || dayKey() };
              backfillIds2.push(id);
            } else backfillIds2.push(id);
          }
        });
        (stateValue.pets || []).forEach(function (pet) {
          if (!pet || !PET_SPECIES[pet.species] || pet.isEgg) return;
          const speciesName = PET_SPECIES[pet.species].name;
          const maxStage = clamp(Number(pet.stage) || 0, 0, PET_STAGES.length - 1);
          for (let s = 0; s <= maxStage; s += 1) {
            const id = codexKey("pet", pet.species + ":" + s);
            if (!codex2.items[id]) {
              codex2.items[id] = { id: id, kind: "pet", key: pet.species + ":" + s, name: speciesName + "·" + PET_STAGES[s], unlocked: true, unlockedAt: stateValue.lastCompletionDay || dayKey() };
              backfillIds2.push(id);
            } else backfillIds2.push(id);
          }
        });
        const bossTemplateInit = BOSS_ROTATION[stateValue.bossIndex] || BOSS_ROTATION[0];
        if (bossTemplateInit) {
          const bossId = codexKey("boss", bossTemplateInit.id);
          if (!codex2.items[bossId]) {
            codex2.items[bossId] = { id: bossId, kind: "boss", key: bossTemplateInit.id, name: bossTemplateInit.name, unlocked: true, unlockedAt: stateValue.lastCompletionDay || dayKey() };
            backfillIds2.push(bossId);
          } else backfillIds2.push(bossId);
        }
        codex2.recentIds = backfillIds2.slice(0, 80).concat((codex2.recentIds || []).filter(function (id) { return backfillIds2.indexOf(id) < 0; }));
        if (codex2.recentIds.length > 80) codex2.recentIds.length = 80;
      }
      stateValue.migrations.codexInitV2 = true;
    }
    // 确保已拥有装备中始终包含“无”；双手字段与 legacy weapon 同步
    if (!stateValue.collection.weapons || !stateValue.collection.weapons.length) stateValue.collection.weapons = ["无", "木剑"];
    else if (stateValue.collection.weapons.indexOf("无") < 0) stateValue.collection.weapons.unshift("无");
    if (!stateValue.profile.appearance.weaponLeft) stateValue.profile.appearance.weaponLeft = "无";
    if (!stateValue.profile.appearance.weaponRight) stateValue.profile.appearance.weaponRight = "无";
    if (stateValue.collection.weapons.indexOf(stateValue.profile.appearance.weaponLeft) < 0) stateValue.profile.appearance.weaponLeft = "无";
    if (stateValue.collection.weapons.indexOf(stateValue.profile.appearance.weaponRight) < 0) stateValue.profile.appearance.weaponRight = "无";
    if (isShieldWeaponValue(stateValue.profile.appearance.weaponRight)) {
      stateValue.profile.appearance.weaponLeft = stateValue.profile.appearance.weaponRight;
      stateValue.profile.appearance.weaponRight = "无";
    }
    stateValue.profile.appearance.weapon = stateValue.profile.appearance.weaponRight || "无";
    stateValue.pets = Array.isArray(stateValue.pets) ? stateValue.pets : [];
    stateValue.pets = stateValue.pets.map(function (pet) {
      if (!pet || !PET_SPECIES[pet.species]) return null;
      pet.name = pet.name || PET_SPECIES[pet.species].name;
      // 统一根据宠物蛋来推导来源与稀有度，确保 Boss 宠物（闹钟小兽 / 白昼幽灵 / 整洁乌鸦）显示正确
      const eggItem = catalogPetEggBySpecies(pet.species);
      if (eggItem && eggItem.purchaseMode === "bossDrop") {
        const boss = BOSS_ROTATION.find(function (b) { return b.id === eggItem.sourceBossId; });
        pet.source = (boss ? boss.name : "Boss") + " 掉落";
      } else if (eggItem && eggItem.purchaseMode === "drop") {
        pet.source = "冒险掉落";
      } else if (!pet.source) {
        pet.source = "商店";
      }
      pet.rarity = petRarityLabel(pet);
      pet.stage = clamp(Number.isFinite(Number(pet.stage)) ? Number(pet.stage) : 0, 0, PET_STAGES.length - 1);
      pet.isEgg = Boolean(pet.isEgg);
      if (pet.isEgg) {
        pet.stage = 0;
        pet.growth = 0;
        pet.displayForm = "egg";
        pet.incubationMinutes = clamp(
          Number(pet.incubationMinutes) || petIncubationMinutesForRarity(pet.rarity || "廉价"),
          1,
          600
        );
        pet.incubationStartedAt = pet.incubationStartedAt || null;
        pet.incubationEndsAt = pet.incubationEndsAt || null;
      } else {
        pet.incubationMinutes = null;
        pet.incubationStartedAt = null;
        pet.incubationEndsAt = null;
        pet.growth = Math.max(0, Number(pet.growth) || 0);
        if (pet.displayForm === "egg") pet.displayForm = "egg";
        else pet.displayForm = clamp(Number.isFinite(Number(pet.displayForm)) ? Number(pet.displayForm) : pet.stage, 0, pet.stage);
      }
      return pet;
    }).filter(Boolean);
    stateValue.hatchedPetCount = Math.max(
      0,
      Math.max(
        Number(stateValue.hatchedPetCount) || 0,
        stateValue.pets.filter(function (pet) { return pet && !pet.isEgg; }).length
      )
    );
    if (!stateValue.currentPetId && stateValue.pets.length > 0) stateValue.currentPetId = stateValue.pets[0].id;
    if (stateValue.currentPetId && !stateValue.pets.some(function (pet) { return pet.id === stateValue.currentPetId; })) {
      stateValue.currentPetId = stateValue.pets.length ? stateValue.pets[0].id : null;
    }
    if (!stateValue.migrations.companionZombieRenameV1) {
      const zombieCompanionId = "zombie";
      const legacyZombieIds = ["Zombie", "zoobie"];
      function mergeCompanionRecord(target, source) {
        const next = target && typeof target === "object" ? target : createDefaultCompanionRecord();
        if (!source || typeof source !== "object") return next;
        next.unlocked = Boolean(next.unlocked || source.unlocked);
        next.affection = Math.max(0, Math.max(Number(next.affection) || 0, Number(source.affection) || 0));
        next.meetings = Math.max(0, Math.max(Number(next.meetings) || 0, Number(source.meetings) || 0));
        const nextLastMetAt = normalizeTimestamp(next.lastMetAt);
        const sourceLastMetAt = normalizeTimestamp(source.lastMetAt);
        next.lastMetAt = Math.max(nextLastMetAt || 0, sourceLastMetAt || 0) || null;
        if (!next.firstMetLocationId && typeof source.firstMetLocationId === "string" && source.firstMetLocationId) next.firstMetLocationId = source.firstMetLocationId;
        if (!next.firstMetLocationName && typeof source.firstMetLocationName === "string" && source.firstMetLocationName.trim()) next.firstMetLocationName = source.firstMetLocationName.trim();
        next.knownLocationIds = Array.from(new Set((Array.isArray(next.knownLocationIds) ? next.knownLocationIds : []).concat(Array.isArray(source.knownLocationIds) ? source.knownLocationIds : [])));
        next.knownFavoriteIds = Array.from(new Set((Array.isArray(next.knownFavoriteIds) ? next.knownFavoriteIds : []).concat(Array.isArray(source.knownFavoriteIds) ? source.knownFavoriteIds : [])));
        next.knownDislikedIds = Array.from(new Set((Array.isArray(next.knownDislikedIds) ? next.knownDislikedIds : []).concat(Array.isArray(source.knownDislikedIds) ? source.knownDislikedIds : [])));
        next.knownFavorite = Boolean(next.knownFavorite || source.knownFavorite);
        next.knownDislike = Boolean(next.knownDislike || source.knownDislike);
        return next;
      }
      if (!stateValue.companions || typeof stateValue.companions !== "object") stateValue.companions = {};
      let zombieRecord = stateValue.companions[zombieCompanionId];
      zombieRecord = zombieRecord && typeof zombieRecord === "object" ? zombieRecord : createDefaultCompanionRecord();
      legacyZombieIds.forEach(function (legacyId) {
        if (!stateValue.companions[legacyId] || typeof stateValue.companions[legacyId] !== "object") return;
        zombieRecord = mergeCompanionRecord(zombieRecord, stateValue.companions[legacyId]);
        delete stateValue.companions[legacyId];
      });
      stateValue.companions[zombieCompanionId] = mergeCompanionRecord(zombieRecord, stateValue.companions[zombieCompanionId]);
      if (normalizeCompanionId(stateValue.selectedCompanionId) === zombieCompanionId) stateValue.selectedCompanionId = zombieCompanionId;
      if (stateValue.adventure && stateValue.adventure.trip && normalizeCompanionId(stateValue.adventure.trip.encounterCompanionId) === zombieCompanionId) {
        stateValue.adventure.trip.encounterCompanionId = zombieCompanionId;
      }
      if (stateValue.modal && normalizeCompanionId(stateValue.modal.companionId) === zombieCompanionId) {
        stateValue.modal.companionId = zombieCompanionId;
      }
      if (stateValue.codex && stateValue.codex.items && typeof stateValue.codex.items === "object") {
        const zombieCodexId = codexKey("companion", zombieCompanionId);
        legacyZombieIds.forEach(function (legacyId) {
          const legacyCodexId = codexKey("companion", legacyId);
          if (!stateValue.codex.items[legacyCodexId]) return;
          const legacyEntry = stateValue.codex.items[legacyCodexId];
          if (!stateValue.codex.items[zombieCodexId]) stateValue.codex.items[zombieCodexId] = legacyEntry;
          else {
            const currentEntry = stateValue.codex.items[zombieCodexId];
            currentEntry.unlocked = Boolean(currentEntry.unlocked || legacyEntry.unlocked);
            currentEntry.seen = Boolean(currentEntry.seen || legacyEntry.seen);
            if (!currentEntry.origin && legacyEntry.origin) currentEntry.origin = legacyEntry.origin;
            if (!currentEntry.unlockedAt && legacyEntry.unlockedAt) currentEntry.unlockedAt = legacyEntry.unlockedAt;
          }
          stateValue.codex.items[zombieCodexId].id = zombieCodexId;
          stateValue.codex.items[zombieCodexId].key = zombieCompanionId;
          stateValue.codex.items[zombieCodexId].name = "Zombie";
          delete stateValue.codex.items[legacyCodexId];
        });
      }
      if (stateValue.codex && Array.isArray(stateValue.codex.recentIds)) {
        const zombieCodexId = codexKey("companion", zombieCompanionId);
        const legacyCodexIds = legacyZombieIds.map(function (legacyId) { return codexKey("companion", legacyId); });
        stateValue.codex.recentIds = Array.from(new Set(stateValue.codex.recentIds.map(function (entryId) {
          return legacyCodexIds.indexOf(entryId) >= 0 ? zombieCodexId : entryId;
        })));
      }
      stateValue.migrations.companionZombieRenameV1 = true;
    }
    if (!stateValue.companions || typeof stateValue.companions !== "object") stateValue.companions = {};
    COMPANIONS.forEach(function (companion) {
      if (!stateValue.companions[companion.id] || typeof stateValue.companions[companion.id] !== "object") {
        stateValue.companions[companion.id] = createDefaultCompanionRecord();
      }
      const record = stateValue.companions[companion.id];
      const codexEntry = stateValue.codex && stateValue.codex.items ? stateValue.codex.items[codexKey("companion", companion.id)] : null;
      const favoriteGiftIds = companionFavoriteGiftIds(companion);
      const dislikedGiftIds = companionDislikedGiftIds(companion);
      record.unlocked = Boolean(record.unlocked);
      record.affection = Math.max(0, Number(record.affection) || 0);
      record.meetings = Math.max(0, Number(record.meetings) || 0);
      record.lastMetAt = normalizeTimestamp(record.lastMetAt);
      record.firstMetLocationId = typeof record.firstMetLocationId === "string" && record.firstMetLocationId ? record.firstMetLocationId : null;
      record.firstMetLocationName = typeof record.firstMetLocationName === "string" && record.firstMetLocationName.trim() ? record.firstMetLocationName.trim() : null;
      record.knownLocationIds = normalizeCompanionKnownLocationIds(record.knownLocationIds, companion, []);
      if (record.unlocked) {
        let firstLocation = record.firstMetLocationId ? adventureLocationById(record.firstMetLocationId) : null;
        if (!firstLocation && record.firstMetLocationName) {
          firstLocation = ADVENTURE_LOCATIONS.find(function (location) { return location.name === record.firstMetLocationName; }) || null;
        }
        if (!firstLocation && codexEntry && typeof codexEntry.origin === "string" && /解锁$/.test(codexEntry.origin)) {
          const originName = codexEntry.origin.replace(/解锁$/, "").trim();
          firstLocation = ADVENTURE_LOCATIONS.find(function (location) { return location.name === originName; }) || null;
        }
        if (!firstLocation) firstLocation = inferredFirstCompanionLocation(companion);
        if (firstLocation) {
          record.firstMetLocationId = firstLocation.id;
          record.firstMetLocationName = firstLocation.name;
          record.knownLocationIds = normalizeCompanionKnownLocationIds(record.knownLocationIds, companion, [firstLocation.id]);
          if (codexEntry && codexEntry.unlocked) codexEntry.origin = firstLocation.name + "解锁";
        }
      }
      record.knownFavoriteIds = normalizeCompanionKnownGiftIds(record.knownFavoriteIds, record.knownFavorite ? favoriteGiftIds : []);
      record.knownDislikedIds = normalizeCompanionKnownGiftIds(record.knownDislikedIds, record.knownDislike ? dislikedGiftIds : []);
      record.knownFavorite = favoriteGiftIds.length > 0 && record.knownFavoriteIds.length >= favoriteGiftIds.length;
      record.knownDislike = dislikedGiftIds.length > 0 && record.knownDislikedIds.length >= dislikedGiftIds.length;
    });
    if (!stateValue.selectedCompanionId || !COMPANIONS.some(function (companion) { return companion.id === stateValue.selectedCompanionId; })) {
      stateValue.selectedCompanionId = COMPANIONS[0] ? COMPANIONS[0].id : null;
    }
    refreshSocialAchievements(stateValue, true);
    if (!stateValue.adventure) stateValue.adventure = {};
    if (typeof stateValue.adventure.slots !== "number") stateValue.adventure.slots = 0;
    if (typeof stateValue.adventure.maxSlots !== "number") stateValue.adventure.maxSlots = 120;
    if (!stateValue.adventure.locationRuns || typeof stateValue.adventure.locationRuns !== "object") stateValue.adventure.locationRuns = {};
    if (!stateValue.adventure.activeTrip || typeof stateValue.adventure.activeTrip !== "object") stateValue.adventure.activeTrip = null;
    if (stateValue.adventure.activeTrip) {
      const trip = stateValue.adventure.activeTrip;
      const validEndsAt = Number.isFinite(Number(trip.endsAt)) ? Number(trip.endsAt) : NaN;
      if (!trip.locationId || !Number.isFinite(validEndsAt)) stateValue.adventure.activeTrip = null;
      else {
        trip.endsAt = validEndsAt;
        trip.startedAt = Number.isFinite(Number(trip.startedAt)) ? Number(trip.startedAt) : Math.max(0, validEndsAt - 60 * 1000);
        if (!companionById(trip.encounterCompanionId)) trip.encounterCompanionId = null;
        if (!trip.locationName) {
          const matchedLocation = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === trip.locationId; });
          trip.locationName = matchedLocation ? matchedLocation.name : "未知地点";
        }
      }
    }
    ADVENTURE_LOCATIONS.forEach(function (location) {
      stateValue.adventure.locationRuns[location.id] = Math.max(0, Number(stateValue.adventure.locationRuns[location.id]) || 0);
    });
    if (typeof stateValue.showCompletedTodo !== "boolean") stateValue.showCompletedTodo = true;
    if (TODO_SORT_ORDER.indexOf(stateValue.todoSortMode) < 0) stateValue.todoSortMode = "default";
    stateValue.journalHistoryMonthOffset = Math.max(0, Math.floor(Number(stateValue.journalHistoryMonthOffset) || 0));
    if (!UI_THEME_PRESETS[stateValue.uiTheme]) stateValue.uiTheme = DEFAULT_UI_THEME;
    if (!stateValue.composer) stateValue.composer = {};
    if (typeof stateValue.composer.taskTitle !== "string") stateValue.composer.taskTitle = "";
    if (!TASK_BUCKET_OPTIONS[stateValue.composer.taskBucket]) stateValue.composer.taskBucket = "todo";
    if (!DIFFICULTIES[stateValue.composer.taskDifficulty]) stateValue.composer.taskDifficulty = "normal";
    if (typeof stateValue.composer.rewardName !== "string") stateValue.composer.rewardName = "";
    if (typeof stateValue.composer.rewardPrice !== "string") stateValue.composer.rewardPrice = "20";
    stateValue.tasks = stateValue.tasks.map(function (task) {
      if (task.bucket === "daily") task.bucket = "habit";
      if (!TASK_BUCKET_OPTIONS[task.bucket]) task.bucket = "todo";
      task.completedToday = Boolean(task.completedToday);
      task.completed = task.bucket === "todo" ? Boolean(task.completed) || Boolean(task.completedToday) : false;
      if (task.bucket !== "todo") task.completed = false;
      task.dueAt = task.bucket === "todo" ? normalizeTimestamp(task.dueAt) : null;
      if (task.lastCompletedAt == null || !Number.isFinite(Number(task.lastCompletedAt))) task.lastCompletedAt = null;
      const completedCountBase = Math.max(0, Math.floor(Number(task.completedCount) || 0));
      task.completedCount = task.bucket === "todo" ? completedCountBase : Math.max(completedCountBase, task.lastCompletedAt ? 1 : 0);
      return task;
    });
    if (stateValue.nextToast === undefined) stateValue.nextToast = null;
    if (stateValue.pendingMoodAfterChest === undefined) stateValue.pendingMoodAfterChest = null;
    if (typeof stateValue.totalCompletedMinigames !== "number") stateValue.totalCompletedMinigames = 0;
    if (typeof stateValue.totalBossDefeated !== "number") stateValue.totalBossDefeated = 0;
    // 每日导出提醒弹窗不写入持久化：读档时清掉，避免卡在「未关闭的提醒」上
    if (stateValue.modal && stateValue.modal.type === "exportReminder") stateValue.modal = null;
    if (stateValue.modal && stateValue.modal.type === "createChallenge") ensureCreateChallengeModalDefaults(stateValue.modal);
    if (stateValue.lastExportReminderDay != null && typeof stateValue.lastExportReminderDay !== "string") stateValue.lastExportReminderDay = null;
    maybeResetDailyState(stateValue);
    return stateValue;
  }

  function loadState() {
    const base = createDefaultState();
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return normalizeState(base);
      const parsed = JSON.parse(saved);
      const merged = mergeState(base, parsed);
      if (!merged.currentPetId && merged.pets.length > 0) merged.currentPetId = merged.pets[0].id;
      return normalizeState(merged);
    } catch (error) {
      return normalizeState(base);
    }
  }

  let state = loadState();
  applyUiTheme(state.uiTheme);

  // 统一节流存档写入，避免频繁 JSON 序列化导致页面卡顿
  let saveStateScheduled = false;
  function saveState() {
    if (saveStateScheduled) return;
    saveStateScheduled = true;
    setTimeout(function () {
      saveStateScheduled = false;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
        // ignore local storage failures in local preview mode
      }
    }, 250);
  }

  // 所有「真正下载 JSON」的导出都走这里：设置页确认导出、每日备份提醒弹窗里的「导出存档」等。
  // 成功后会统一更新 lastExportAt / exportCount，设置里「上一次导出存档」与成就统计一致。
  function exportSaveToFile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || JSON.stringify(state);
      if (!raw) {
        setToast("当前没有可导出的存档。", "danger");
        renderApp();
        return;
      }
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const now = new Date();
      const pad = function (value) { return String(value).padStart(2, "0"); };
      const filename = "questup-save-" + now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) + "-" + pad(now.getHours()) + pad(now.getMinutes()) + ".json";
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToast("存档已下载。", "success");
      state.lastExportReminderDay = dayKey();
      state.lastExportAt = Date.now();
      state.exportCount = (state.exportCount || 0) + 1;
      unlockAchievement("misc_export_save");
    } catch (error) {
      console.error("exportSaveToFile failed", error);
      setToast("导出存档失败。", "danger");
    }
    setModal(null);
  }

  function dismissExportReminderModal() {
    state.lastExportReminderDay = dayKey();
    setModal(null);
  }

  /** 每日首次进入且本日尚未处理过提醒时弹出（与已有弹窗互斥） */
  function maybeShowExportReminderModal() {
    if (state.modal) return;
    if (state.lastExportReminderDay === dayKey()) return;
    setModal({ type: "exportReminder" });
  }

  function beginImportSaveFromFile() {
    try {
      if (!importFileInput) {
        importFileInput = document.createElement("input");
        importFileInput.type = "file";
        importFileInput.accept = ".json,application/json";
        importFileInput.style.display = "none";
        document.body.appendChild(importFileInput);
      }
      importFileInput.value = "";
      importFileInput.onchange = function (event) {
        const files = event && event.target && event.target.files;
        const file = files && files[0] ? files[0] : null;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const text = String(reader.result || "");
            const parsed = JSON.parse(text);
            const merged = mergeState(createDefaultState(), parsed);
            const normalized = normalizeState(merged);
            state = normalized;
            applyUiTheme(state.uiTheme);
            state.importCount = (state.importCount || 0) + 1;
            saveState();
            setToast("存档已导入。", "success");
            unlockAchievement("misc_import_save");
            setModal(null);
            renderApp();
          } catch (error) {
            console.error("importSaveFromFile failed", error);
            setToast("导入存档失败，文件格式不正确。", "danger");
            renderApp();
          }
        };
        reader.onerror = function () {
          setToast("读取存档文件失败。", "danger");
          renderApp();
        };
        reader.readAsText(file, "utf-8");
      };
      importFileInput.click();
    } catch (error) {
      console.error("beginImportSaveFromFile failed", error);
      setToast("导入存档失败。", "danger");
      renderApp();
    }
  }

  function currentBossTemplate() {
    return BOSS_ROTATION[state.bossIndex] || BOSS_ROTATION[0];
  }

  function ensureBossDeadline() {
    const template = currentBossTemplate();
    if (!template || !template.timeLimitHours) {
      state.bossDeadlineAt = null;
      return;
    }
    const now = Date.now();
    if (state.bossDeadlineAt == null) {
      state.bossDeadlineAt = now + template.timeLimitHours * 3600000;
      return;
    }
    if (state.boss.hp > 0 && now > state.bossDeadlineAt) {
      addLog("你没能在限定时间内击败 " + template.name + "，它暂时退去了。");
      advanceBoss();
    }
  }

  function currentPet() {
    if (!state.pets.length) return null;
    return state.pets.find(function (pet) { return pet.id === state.currentPetId; }) || state.pets[0] || null;
  }

  function normalizeCompanionId(companionId) {
    const rawId = typeof companionId === "string" ? companionId.trim() : "";
    if (!rawId) return rawId;
    const lowerId = rawId.toLowerCase();
    if (lowerId === "zoobie" || lowerId === "zombie") return "zombie";
    return rawId;
  }

  function companionById(companionId) {
    const normalizedId = normalizeCompanionId(companionId);
    return COMPANIONS.find(function (companion) { return companion.id === normalizedId; }) || null;
  }

  function activeCompanionRecord(companionId) {
    const normalizedId = normalizeCompanionId(companionId);
    if (!state.companions || typeof state.companions !== "object") state.companions = createInitialCompanionState();
    if (!state.companions[normalizedId] || typeof state.companions[normalizedId] !== "object") {
      state.companions[normalizedId] = createDefaultCompanionRecord();
    }
    return state.companions[normalizedId];
  }

  function selectedCompanion() {
    const selectedId = state.selectedCompanionId || (COMPANIONS[0] && COMPANIONS[0].id) || null;
    return companionById(selectedId) || COMPANIONS[0] || null;
  }

  function companionAffinityMeta(affectionValue) {
    const total = Math.max(0, Number(affectionValue) || 0);
    const fallback = COMPANION_AFFECTION_LEVELS[0];
    let current = fallback;
    for (let i = 0; i < COMPANION_AFFECTION_LEVELS.length; i += 1) {
      const levelEntry = COMPANION_AFFECTION_LEVELS[i];
      current = levelEntry;
      if (total < levelEntry.max || i === COMPANION_AFFECTION_LEVELS.length - 1) break;
    }
    const next = COMPANION_AFFECTION_LEVELS[Math.min(COMPANION_AFFECTION_LEVELS.length - 1, current.level)] || null;
    const currentValue = total - current.min;
    const rangeMax = Math.max(1, (current.max || current.min) - current.min);
    const displayValue = current.level >= COMPANION_AFFECTION_LEVELS.length ? rangeMax : clamp(currentValue, 0, rangeMax);
    return {
      total: total,
      level: current.level,
      name: current.name,
      min: current.min,
      max: current.max,
      progressValue: displayValue,
      progressMax: rangeMax,
      isMax: current.level >= COMPANION_AFFECTION_LEVELS.length,
      next: next
    };
  }

  function unlockedCompanionCount(targetState) {
    const safeState = targetState || state;
    const records = safeState && safeState.companions && typeof safeState.companions === "object" ? safeState.companions : {};
    return COMPANIONS.reduce(function (total, companion) {
      const record = records[companion.id];
      return total + (record && record.unlocked ? 1 : 0);
    }, 0);
  }

  function companionsAtAffinityLevelCount(targetLevel, targetState) {
    const safeState = targetState || state;
    const records = safeState && safeState.companions && typeof safeState.companions === "object" ? safeState.companions : {};
    return COMPANIONS.reduce(function (total, companion) {
      const record = records[companion.id];
      if (!record || !record.unlocked) return total;
      return total + (companionAffinityMeta(record.affection).level >= targetLevel ? 1 : 0);
    }, 0);
  }

  function hatchedPetCountForState(targetState) {
    const safeState = targetState || state;
    const pets = safeState && Array.isArray(safeState.pets) ? safeState.pets : [];
    const derivedCount = pets.filter(function (pet) { return pet && !pet.isEgg; }).length;
    return Math.max(0, Math.max(Number(safeState && safeState.hatchedPetCount) || 0, derivedCount));
  }

  function adultPetCountForState(targetState) {
    const safeState = targetState || state;
    const pets = safeState && Array.isArray(safeState.pets) ? safeState.pets : [];
    return pets.filter(function (pet) {
      return pet && !pet.isEgg && Number(pet.stage) >= PET_STAGES.length - 1;
    }).length;
  }

  function companionAffinityGainByGift(item, companion) {
    const rarity = itemRarityLabel(item);
    const range = COMPANION_GIFT_AFFECTION_RANGES[rarity] || COMPANION_GIFT_AFFECTION_RANGES["廉价"];
    let gain = randomInt(range.min, range.max);
    if (companion && item && companionFavoriteGiftIds(companion).indexOf(item.id) >= 0) gain = Math.round(gain * 2);
    else if (companion && item && companionDislikedGiftIds(companion).indexOf(item.id) >= 0) gain = Math.max(1, Math.round(gain * 0.5));
    return Math.max(1, gain);
  }

  function isGiftableShopItem(item) {
    return Boolean(item)
      && GIFTABLE_SHOP_CATEGORIES.indexOf(item.category) >= 0
      && item.shopVisible !== false
      && item.purchaseMode !== "drop"
      && item.purchaseMode !== "bossDrop";
  }

  function codexEntryUnlocked(entryId) {
    const codex = activeCodex();
    return Boolean(codex.items[entryId] && codex.items[entryId].unlocked);
  }

  function companionGiftShopItems() {
    return SHOP_CATALOG.filter(isGiftableShopItem).slice().sort(function (a, b) {
      if ((a.price || 0) !== (b.price || 0)) return (a.price || 0) - (b.price || 0);
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
  }

  function companionLocationNames(companion) {
    return (companion && Array.isArray(companion.locationIds) ? companion.locationIds : []).map(function (locationId) {
      const location = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === locationId; });
      return location ? location.name : locationId;
    });
  }

  function companionPortraitSceneName(companion, fallbackSceneName) {
    const preferred = companion && typeof companion.portraitScene === "string" ? companion.portraitScene.trim() : "";
    if (preferred && SCENE_THEMES[preferred]) return preferred;
    const appearanceBackground = companion && companion.appearance && typeof companion.appearance.background === "string"
      ? companion.appearance.background.trim()
      : "";
    if (appearanceBackground && SCENE_THEMES[appearanceBackground]) return appearanceBackground;
    const fallback = typeof fallbackSceneName === "string" ? fallbackSceneName.trim() : "";
    if (fallback && SCENE_THEMES[fallback]) return fallback;
    const locations = companionLocationNames(companion);
    if (locations[0] && SCENE_THEMES[locations[0]]) return locations[0];
    return "草地小径";
  }

  function adventureLocationById(locationId) {
    return ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === locationId; }) || null;
  }

  function companionGiftIds(value, fallbackValue) {
    const direct = Array.isArray(value) ? value.filter(Boolean) : [];
    if (direct.length) return Array.from(new Set(direct));
    if (fallbackValue) return [fallbackValue];
    return [];
  }

  function normalizeCompanionKnownGiftIds(value, fallbackIds) {
    const knownIds = Array.isArray(value) ? value.filter(Boolean) : [];
    const extraIds = Array.isArray(fallbackIds) ? fallbackIds.filter(Boolean) : [];
    return Array.from(new Set(knownIds.concat(extraIds)));
  }

  function normalizeCompanionKnownLocationIds(value, companion, fallbackIds) {
    const allowedIds = companion && Array.isArray(companion.locationIds) ? companion.locationIds : [];
    const knownIds = Array.isArray(value) ? value.filter(function (locationId) {
      return allowedIds.indexOf(locationId) >= 0;
    }) : [];
    const extraIds = Array.isArray(fallbackIds) ? fallbackIds.filter(function (locationId) {
      return allowedIds.indexOf(locationId) >= 0;
    }) : [];
    return Array.from(new Set(knownIds.concat(extraIds)));
  }

  function inferredFirstCompanionLocation(companion) {
    const candidates = (companion && Array.isArray(companion.locationIds) ? companion.locationIds : []).map(function (locationId, index) {
      const location = adventureLocationById(locationId);
      if (!location) return null;
      return { location: location, order: index };
    }).filter(Boolean);
    if (!candidates.length) return null;
    candidates.sort(function (a, b) {
      const levelGap = (a.location.unlockLevel || 1) - (b.location.unlockLevel || 1);
      if (levelGap !== 0) return levelGap;
      return a.order - b.order;
    });
    return candidates[0].location;
  }

  function companionDisplayLocationNames(companion, knownLocationIds) {
    const locationIds = companion && Array.isArray(companion.locationIds) ? companion.locationIds : [];
    if (!locationIds.length) return "未知地点";
    const knownIds = normalizeCompanionKnownLocationIds(knownLocationIds, companion, []);
    return locationIds.map(function (locationId) {
      if (knownIds.indexOf(locationId) < 0) return "???";
      const location = adventureLocationById(locationId);
      return location ? location.name : "未知地点";
    }).join(" / ");
  }

  function companionFavoriteGiftIds(companion) {
    return companionGiftIds(companion && companion.favoriteGiftIds, companion && companion.favoriteGiftId);
  }

  function companionDislikedGiftIds(companion) {
    return companionGiftIds(companion && companion.dislikedGiftIds, companion && companion.dislikedGiftId);
  }

  function companionDisplayGiftName(itemId, known) {
    const itemIds = Array.isArray(itemId) ? itemId.filter(Boolean) : (itemId ? [itemId] : []);
    if (!itemIds.length) return "未知礼物";
    const knownIds = known === true ? itemIds.slice() : (Array.isArray(known) ? known.filter(Boolean) : []);
    return itemIds.map(function (entryId) {
      if (knownIds.indexOf(entryId) < 0) return "???";
      const item = catalogItemById(entryId);
      return item ? item.name : "未知礼物";
    }).join(" / ");
  }

  function rollAdventureEncounterCompanion(locationId) {
    const candidates = COMPANIONS.filter(function (companion) {
      return Array.isArray(companion.locationIds) && companion.locationIds.indexOf(locationId) >= 0;
    });
    if (!candidates.length) return null;
    if (Math.random() > COMPANION_ENCOUNTER_CHANCE) return null;
    return candidates[randomInt(0, candidates.length - 1)] || null;
  }

  function petDisplayName(pet) {
    if (!pet) return "暂无宠物";
    return pet.isEgg ? PET_SPECIES[pet.species].name + "蛋" : pet.name;
  }

  function petStageLabel(pet) {
    if (!pet) return "暂无";
    return pet.isEgg ? "宠物蛋" : (PET_STAGES[pet.stage] || PET_STAGES[0]);
  }

  function petIntroText(pet) {
    if (!pet || !PET_SPECIES[pet.species]) return "";
    return String(PET_SPECIES[pet.species].intro || "").trim();
  }

  function petDisplayFormValue(pet) {
    if (!pet || pet.isEgg) return "egg";
    if (pet.displayForm === "egg") return "egg";
    return clamp(Number.isFinite(Number(pet.displayForm)) ? Number(pet.displayForm) : pet.stage, 0, pet.stage);
  }

  function petDisplayFormLabel(pet, value) {
    const formValue = value === undefined ? petDisplayFormValue(pet) : value;
    if (formValue === "egg") return "蛋";
    return PET_STAGES[clamp(Number(formValue) || 0, 0, PET_STAGES.length - 1)] || PET_STAGES[0];
  }

  function petDisplayFormOptions(pet) {
    if (!pet) return [];
    if (pet.isEgg) return ["egg"];
    const options = ["egg"];
    for (let i = 0; i <= pet.stage; i += 1) options.push(i);
    return options;
  }

  function petGrowthNeeded(pet) {
    if (!pet) return 0;
    if (pet.isEgg) return Math.max(1, pet.incubationMinutes || 60);
    if (pet.stage === 0) return 90;
    if (pet.stage === 1) return 150;
    return 0;
  }

  function petGrowthValue(pet) {
    if (!pet) return 0;
    if (pet.isEgg) {
      if (!pet.incubationStartedAt || !pet.incubationEndsAt) return 0;
      const remaining = Math.max(0, Math.ceil((pet.incubationEndsAt - Date.now()) / 60000));
      return clamp((pet.incubationMinutes || 1) - remaining, 0, pet.incubationMinutes || 1);
    }
    return clamp(pet.growth || 0, 0, Math.max(1, petGrowthNeeded(pet)));
  }

  function petInstantHatchCost(pet) {
    if (!pet || !pet.isEgg) return 0;
    // 价格 = 剩余孵化分钟数 × 1.5（向上取整）
    const remaining = pet.incubationStartedAt && pet.incubationEndsAt
      ? Math.max(1, Math.ceil((pet.incubationEndsAt - Date.now()) / 60000))
      : (pet.incubationMinutes || 1);
    return Math.max(1, Math.ceil(remaining * 1.5));
  }

  function finishHatching(pet, reasonText) {
    if (!pet || !pet.isEgg) return;
    const petName = pet.name;
    pet.isEgg = false;
    pet.stage = 0;
    pet.displayForm = 0;
    pet.growth = 0;
    pet.incubationMinutes = null;
    pet.incubationStartedAt = null;
    pet.incubationEndsAt = null;
    delete pet._lastRemaining;
    addLog("“" + petName + "”孵化完成，进入了幼年阶段。" + (reasonText ? "（" + reasonText + "）" : ""));
    setToast(petName + " 孵化完成。", "success");
    state.hatchedPetCount = (state.hatchedPetCount || 0) + 1;
    // 孵化进入幼年时同步解锁幼年阶段图鉴（stage=0）
    unlockCodexEntry("pet", pet.species + ":0", pet.name + "·" + PET_STAGES[0], null);
    unlockAchievement("adventure_pet_hatched");
    if ((state.hatchedPetCount || 0) >= 3) unlockAchievement("collection_pet_3");
    refreshSocialAchievements(state, false);
  }

  function applyPetGrowth(pet, amount) {
    if (!pet || pet.isEgg || pet.stage >= PET_STAGES.length - 1) return false;
    pet.growth = (pet.growth || 0) + amount;
    let evolved = false;
    while (pet.stage < PET_STAGES.length - 1) {
      const needed = petGrowthNeeded(pet);
      if (pet.growth < needed) break;
      pet.growth -= needed;
      pet.stage += 1;
      evolved = true;
      addLog(pet.name + " 成长到了 " + PET_STAGES[pet.stage] + " 阶段。");
      unlockCodexEntry("pet", pet.species + ":" + pet.stage, pet.name + "·" + PET_STAGES[pet.stage], null);
      if (pet.stage >= PET_STAGES.length - 1) {
        pet.growth = 0;
        unlockAchievement("adventure_pet_adult");
        refreshSocialAchievements(state, false);
        break;
      }
    }
    return evolved;
  }

  function setToast(text, variant) {
    state.toast = { text: text, variant: variant || "info", expiresAt: Date.now() + 1000 };
  }

  function queueToast(text, variant) {
    if (!state.toast) {
      setToast(text, variant);
    } else {
      state.nextToast = { text: text, variant: variant || "info" };
    }
  }

  function currentHeroMood() {
    const hp = Math.max(0, Number(state.profile.hp) || 0);
    const maxHp = Math.max(1, Number(state.profile.maxHp) || 1);
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    for (let i = 0; i < HERO_MOOD_LEVELS.length; i += 1) {
      const mood = HERO_MOOD_LEVELS[i];
      if (ratio >= mood.min && ratio <= mood.max + 1e-6) return mood;
    }
    return HERO_MOOD_LEVELS[HERO_MOOD_LEVELS.length - 1];
  }

  function heroExpMultiplier() {
    const mood = currentHeroMood();
    return Math.max(0, Number(mood.expMultiplier) || 1);
  }

  function addGold(amount) {
    state.profile.gold += amount;
    state.todayStats.goldIn += amount;
    if (state.profile.gold >= 500) unlockAchievement("collection_gold_500");
    if (state.profile.gold >= 1000) unlockAchievement("collection_gold_1000");
    if (state.profile.gold >= 2000) unlockAchievement("collection_gold_2000");
  }

  function spendGold(amount) {
    state.profile.gold = Math.max(0, state.profile.gold - amount);
    state.todayStats.goldOut += amount;
  }

  function addExp(amount) {
    const gained = Math.max(0, Math.round(Number(amount) || 0));
    if (gained <= 0) return 0;
    state.profile.exp += gained;
    state.todayStats.exp += gained;
    ensureHistoryDay(state.todayStats.dayKey).exp += gained;
    while (state.profile.exp >= state.profile.expToNext) {
      state.profile.exp -= state.profile.expToNext;
      state.profile.level += 1;
      state.profile.expToNext = Math.round(state.profile.expToNext * 1.18 + 18);
      state.profile.maxHp += 10;
      state.profile.hp = state.profile.maxHp;
      addLog("升级到了 Lv." + state.profile.level + "，状态全满。");
      setToast("升级了，体力和经验上限提升。", "success");
      if (state.profile.level >= 2) unlockAchievement("level_2");
      if (state.profile.level >= 5) unlockAchievement("level_5");
      if (state.profile.level >= 10) unlockAchievement("level_10");
      if (state.profile.level >= 20) unlockAchievement("level_20");
    }
    return gained;
  }

  function loseHp(amount) {
    state.profile.hp = clamp(state.profile.hp - amount, 0, state.profile.maxHp);
  }

  function healHp(amount) {
    state.profile.hp = clamp(state.profile.hp + amount, 0, state.profile.maxHp);
  }

  function isSupplyItem(item) {
    return Boolean(item) && item.category === "supply";
  }

  function ensureSupplyInventory(targetState) {
    const outputState = targetState || state;
    if (!outputState.supplies || typeof outputState.supplies !== "object" || Array.isArray(outputState.supplies)) {
      outputState.supplies = {};
    }
    return outputState.supplies;
  }

  function supplyCount(itemId, targetState) {
    const supplies = ensureSupplyInventory(targetState || state);
    return Math.max(0, Math.floor(Number(supplies[itemId]) || 0));
  }

  function addSupply(itemId, amount, targetState) {
    const supplies = ensureSupplyInventory(targetState || state);
    const nextCount = supplyCount(itemId, targetState) + Math.max(0, Math.floor(Number(amount) || 0));
    supplies[itemId] = nextCount;
    return nextCount;
  }

  function consumeSupply(itemId, amount, targetState) {
    const outputState = targetState || state;
    const supplies = ensureSupplyInventory(outputState);
    const current = supplyCount(itemId, outputState);
    const spend = Math.max(0, Math.floor(Number(amount) || 0));
    const nextCount = Math.max(0, current - spend);
    if (nextCount > 0) supplies[itemId] = nextCount;
    else delete supplies[itemId];
    return nextCount;
  }

  function supplySellPrice(item) {
    return Math.max(1, Math.floor((Number(item && item.price) || 0) / 2));
  }

  function ownedSupplyItems() {
    return Object.keys(ensureSupplyInventory())
      .map(function (itemId) {
        const item = catalogItemById(itemId);
        if (!item || !isSupplyItem(item)) return null;
        return { item: item, count: supplyCount(itemId) };
      })
      .filter(function (entry) { return entry && entry.count > 0; })
      .sort(function (a, b) {
        const levelGap = itemRequiredLevel(a.item) - itemRequiredLevel(b.item);
        if (levelGap !== 0) return levelGap;
        const priceGap = (a.item.price || 0) - (b.item.price || 0);
        if (priceGap !== 0) return priceGap;
        return a.item.name.localeCompare(b.item.name, "zh-Hans-CN");
      });
  }

  function ensureOwned(category, value) {
    const key = COLLECTION_KEYS[category];
    if (!key) return;
    if (!state.collection[key].includes(value)) state.collection[key].push(value);
  }

  function isOwnedCatalogItem(item) {
    if (isSupplyItem(item)) return false;
    if (item.category === "petEgg") {
      return state.pets.some(function (pet) { return pet.species === item.petSpecies; });
    }
    const key = COLLECTION_KEYS[item.category];
    return state.collection[key].includes(item.unlockValue);
  }

  function isEquippedCatalogItem(item) {
    if (!item || isSupplyItem(item)) return false;
    if (item.category === "petEgg") {
      const followed = currentPet();
      return Boolean(followed) && followed.species === item.petSpecies;
    }
    if (item.category === "accessory") {
      return currentAccessories(state.profile.appearance).includes(item.unlockValue);
    }
    if (item.category === "item") {
      const left = state.profile.appearance.weaponLeft || "无";
      const right = state.profile.appearance.weaponRight || state.profile.appearance.weapon || "无";
      return left === item.unlockValue || right === item.unlockValue;
    }
    const appearanceKey = APPEARANCE_KEYS[item.category];
    if (!appearanceKey) return false;
    return state.profile.appearance[appearanceKey] === item.unlockValue;
  }

  function equipCatalogItem(item) {
    if (item.category === "petEgg") {
      const matchingPet = state.pets.find(function (pet) { return pet.species === item.petSpecies; });
      if (matchingPet) state.currentPetId = matchingPet.id;
      return;
    }
    if (item.category === "accessory") {
      let list = currentAccessories(state.profile.appearance);
      const v = item.unlockValue;
      if (list.indexOf(v) >= 0) return;

      // 装备任意“非无”配饰时，强制移除“无”空手选项
      if (v !== "无") list = list.filter(function (existing) { return existing !== "无"; });

      // 冲突则替换：把所有与 v 像素重合的已佩戴配饰移除，再装备新配饰
      const conflicts = list.filter(function (existing) {
        return accessoryOverlapsWithList(v, [existing]);
      });
      if (conflicts.length) {
        list = list.filter(function (existing) { return conflicts.indexOf(existing) < 0; });
      }

      if (list.length >= MAX_ACCESSORIES) return;
      state.profile.appearance.accessories = list.concat([v]);
      return;
    }
    if (item.category === "item") {
      const v = item.unlockValue;
      if (!state.profile.appearance) state.profile.appearance = defaultAppearance();
      if (v === "无") {
        state.profile.appearance.weaponLeft = "无";
        state.profile.appearance.weaponRight = "无";
      } else {
        const hand = weaponHandForValue(v);
        if (hand === "left") state.profile.appearance.weaponLeft = v;
        else state.profile.appearance.weaponRight = v;
      }
      state.profile.appearance.weapon = state.profile.appearance.weaponRight || "无";
      return;
    }
    state.profile.appearance[APPEARANCE_KEYS[item.category]] = item.unlockValue;
  }

  function spawnPet(species, source, rarity) {
    if (state.pets.some(function (pet) { return pet.species === species; })) return null;
    const pet = createPet(species, source, rarity);
    state.pets.push(pet);
    if (!state.currentPetId) state.currentPetId = pet.id;
    return pet;
  }

  function grantCatalogReward(itemId, sourceText) {
    const item = catalogItemById(itemId);
    if (!item) return null;
    if (isSupplyItem(item)) {
      const nextCount = addSupply(item.id, 1);
      addLog("获得了补给“" + item.name + "”，当前有 " + nextCount + " 份。");
      unlockCodexEntry("supply", item.id, item.name, sourceText);
      return {
        label: item.name + " ×1",
        subtitle: (sourceText || "补给奖励") + " 带回了可重复使用的补给。"
      };
    }
    if (item.category === "petEgg") {
      const pet = spawnPet(item.petSpecies, sourceText, itemRarityLabel(item));
      if (pet) {
        addLog("获得了“" + PET_SPECIES[item.petSpecies].name + "蛋”，它进入了宠物中心。");
        unlockCodexEntry("pet", item.id, PET_SPECIES[item.petSpecies].name + "蛋", sourceText);
        return { label: PET_SPECIES[item.petSpecies].name + "蛋", subtitle: sourceText + " 带回了一颗待孵化的宠物蛋。" };
      }
      // 已拥有同种宠物时，按蛋的“售价”折算为金币（Boss 掉落也遵循这一规则）
      const eggGold = Math.max(1, Number(item.price) || 16);
      addGold(eggGold);
      addLog("重复的“" + (PET_SPECIES[item.petSpecies] ? PET_SPECIES[item.petSpecies].name : "宠物") + "蛋”折算成了 " + eggGold + " 金币。");
      return { label: eggGold + " 金币", subtitle: "重复奖励已按售价折算为金币。" };
    }
    if (!isOwnedCatalogItem(item)) {
      ensureOwned(item.category, item.unlockValue);
      equipCatalogItem(item);
      addLog("获得了“" + item.name + "”，并立刻装备上了。");
      unlockCodexEntry(codexKindForItemCategory(item.category), item.id, item.name, sourceText);
      return { label: item.name, subtitle: sourceText + " 带回了新的像素收藏。" };
    }
    // 非宠物蛋：已拥有时按物品“售价”折算为金币
    const repeatGold = Math.max(1, Number(item.price) || 18);
    addGold(repeatGold);
    addLog("重复掉落的“" + item.name + "”折算成了 " + repeatGold + " 金币。");
    return { label: repeatGold + " 金币", subtitle: "重复奖励已按售价折算为金币。" };
  }

  function showTreasure(title, subtitle, rewards, modalTitle) {
    const rewardList = Array.isArray(rewards) && rewards.length ? rewards : [{ label: title, detail: subtitle }];
    setModal({
      type: "treasure",
      phase: "rewards",
      title: modalTitle || "你获得了奖励",
      rewardLabel: title,
      subtitle: subtitle,
      rewards: rewardList
    });
  }

  function buildCompanionAdventureStory(companion, location) {
    const safeCompanion = companion || COMPANIONS[0];
    const sceneName = location && location.name ? location.name : "这片地方";
    const pool = safeCompanion && Array.isArray(safeCompanion.storyLibrary) && safeCompanion.storyLibrary.length
      ? safeCompanion.storyLibrary
      : ["你在{scene}遇见了{name}，这段偶遇让这趟冒险忽然有了新的章节。"];
    return String(pool[randomInt(0, pool.length - 1)] || pool[0])
      .replace(/\{scene\}/g, sceneName)
      .replace(/\{name\}/g, safeCompanion && safeCompanion.name ? safeCompanion.name : "伙伴");
  }

  function companionGiftReward(companion, sourceText) {
    if (!companion || !Array.isArray(companion.rewardPool) || !companion.rewardPool.length) return null;
    const rewardId = companion.rewardPool[randomInt(0, companion.rewardPool.length - 1)];
    const granted = grantCatalogReward(rewardId, sourceText || (companion.name + " 的回礼"));
    if (!granted) return null;
    return {
      label: granted.label,
      detail: granted.subtitle || (companion.name + " 给了你一份回礼。")
    };
  }

  function applyCompanionAffectionGain(companionId, gainValue, sourceText, options) {
    const companion = companionById(companionId);
    if (!companion) return { rewardEntries: [] };
    const record = activeCompanionRecord(companionId);
    const extra = options || {};
    const gain = Math.max(1, Math.round(Number(gainValue) || 0));
    const before = companionAffinityMeta(record.affection);
    record.affection += gain;
    const after = companionAffinityMeta(record.affection);
    const rewardEntries = [{
      label: "+" + gain + " 好感",
      detail: sourceText || (companion.name + " 对你更熟悉了一点。")
    }];
    if (extra.revealFavoriteItemId) {
      const favoriteItem = catalogItemById(extra.revealFavoriteItemId);
      rewardEntries.push({
        label: "发现喜好",
        detail: companion.name + " 喜欢的礼物之一是“" + (favoriteItem ? favoriteItem.name : "未知礼物") + "”。"
      });
    }
    if (extra.revealDislikeItemId) {
      const dislikedItem = catalogItemById(extra.revealDislikeItemId);
      rewardEntries.push({
        label: "发现偏好",
        detail: companion.name + " 不喜欢的礼物之一是“" + (dislikedItem ? dislikedItem.name : "未知礼物") + "”。"
      });
    }
    if (after.level > before.level) {
      for (let level = before.level + 1; level <= after.level; level += 1) {
        const levelMeta = COMPANION_AFFECTION_LEVELS[Math.max(0, level - 1)];
        if (levelMeta) {
          addLog("你和“" + companion.name + "”的好感提升到了 Lv." + level + "「" + levelMeta.name + "」。");
          rewardEntries.push({
            label: companion.name + " 好感 Lv." + level,
            detail: "关系提升到了“" + levelMeta.name + "”。"
          });
        }
        const giftEntry = companionGiftReward(companion, companion.name + " 的回礼");
        if (giftEntry) rewardEntries.push({
          label: giftEntry.label,
          detail: companion.name + " 送来了回礼。"
        });
      }
    }
    refreshSocialAchievements(state, false);
    return { before: before, after: after, rewardEntries: rewardEntries };
  }

  function settleCompanionEncounter(companionId, location, sourceLabel) {
    const companion = companionById(companionId);
    if (!companion) return { rewardEntries: [] };
    const record = activeCompanionRecord(companionId);
    const firstUnlock = !record.unlocked;
    const meetLocationId = location && location.id ? location.id : null;
    const meetLocationName = location && location.name ? location.name : "冒险途中";
    record.unlocked = true;
    record.meetings = Math.max(0, Number(record.meetings) || 0) + 1;
    record.lastMetAt = Date.now();
    record.knownLocationIds = normalizeCompanionKnownLocationIds(record.knownLocationIds, companion, meetLocationId ? [meetLocationId] : []);
    if (!record.firstMetLocationId && meetLocationId) record.firstMetLocationId = meetLocationId;
    if (!record.firstMetLocationName && meetLocationName) record.firstMetLocationName = meetLocationName;
    unlockCodexEntry("companion", companion.id, companion.name, (record.firstMetLocationName || meetLocationName || "???") + "解锁");
    if (firstUnlock) setToast("解锁了伙伴“" + companion.name + "”！", "success");
    addLog("你在“" + meetLocationName + "”遇见了伙伴“" + companion.name + "”。");
    const gain = randomInt(COMPANION_ADVENTURE_AFFECTION_RANGE.min, COMPANION_ADVENTURE_AFFECTION_RANGE.max);
    const affectionResult = applyCompanionAffectionGain(companionId, gain, sourceLabel || ("在“" + meetLocationName + "”的偶遇让关系变近了一点。"));
    return {
      companion: companion,
      firstUnlock: firstUnlock,
      rewardEntries: affectionResult.rewardEntries
    };
  }

  function setSocialTab(tabId) {
    state.socialTab = tabId === SOCIAL_TABS.companions ? SOCIAL_TABS.companions : SOCIAL_TABS.pets;
    saveState();
    renderApp();
  }

  function selectCompanion(companionId) {
    const normalizedId = normalizeCompanionId(companionId);
    if (!companionById(normalizedId)) return;
    state.selectedCompanionId = normalizedId;
    saveState();
    renderApp();
  }

  function setCompanionStripScroll(nextScroll, maxScroll) {
    const safeMax = Math.max(0, Number(maxScroll) || 0);
    const clamped = clamp(Number(nextScroll) || 0, 0, safeMax);
    if (clamped === (Number(state.companionStripScroll) || 0)) return;
    state.companionStripScroll = clamped;
    renderApp();
  }

  function scrollCompanionStrip(delta, maxScroll) {
    setCompanionStripScroll((Number(state.companionStripScroll) || 0) + delta, maxScroll);
  }

  function openCompanionGiftShop(companionId) {
    const normalizedId = normalizeCompanionId(companionId);
    const companion = companionById(normalizedId);
    if (!companion) return;
    const record = activeCompanionRecord(normalizedId);
    if (!record.unlocked) {
      setToast("先在冒险里遇见这位伙伴吧。", "info");
      renderApp();
      return;
    }
    setModal({ type: "companionGiftShop", companionId: normalizedId, page: 0 });
  }

  function shiftCompanionGiftShopPage(delta) {
    if (!state.modal || state.modal.type !== "companionGiftShop") return;
    const items = companionGiftShopItems();
    const perPage = Math.max(1, Number(state.modal.giftShopPerPage) || 6);
    const maxPage = Math.max(0, Math.ceil(items.length / perPage) - 1);
    state.modal.page = clamp((state.modal.page || 0) + delta, 0, maxPage);
    renderApp();
  }

  function shiftSettingsThemePage(delta) {
    if (!state.modal || state.modal.type !== "settings") return;
    const themes = settingsThemePresets();
    const perPage = Math.max(1, Number(state.modal.themePerPage) || 2);
    const maxPage = Math.max(0, Math.ceil(themes.length / perPage) - 1);
    state.modal.themePage = clamp((state.modal.themePage || 0) + delta, 0, maxPage);
    renderApp();
  }

  function buyGiftForCompanion(companionId, itemId) {
    const companion = companionById(companionId);
    const item = catalogItemById(itemId);
    if (!companion || !item || !isGiftableShopItem(item)) return;
    const record = activeCompanionRecord(companionId);
    if (!record.unlocked) {
      setToast("先在冒险里遇见这位伙伴吧。", "info");
      renderApp();
      return;
    }
    const codexId = codexKey(codexKindForItemCategory(item.category), item.id);
    if (!codexEntryUnlocked(codexId)) {
      setToast("这件礼物还没有在图鉴中解锁。", "info");
      renderApp();
      return;
    }
    if (state.profile.gold < item.price) {
      setToast("金币不足。", "danger");
      renderApp();
      return;
    }
    const favoriteGiftIds = companionFavoriteGiftIds(companion);
    const dislikedGiftIds = companionDislikedGiftIds(companion);
    const knownFavoriteIds = normalizeCompanionKnownGiftIds(record.knownFavoriteIds);
    const knownDislikedIds = normalizeCompanionKnownGiftIds(record.knownDislikedIds);
    const revealFavorite = favoriteGiftIds.indexOf(item.id) >= 0 && knownFavoriteIds.indexOf(item.id) < 0;
    const revealDislike = dislikedGiftIds.indexOf(item.id) >= 0 && knownDislikedIds.indexOf(item.id) < 0;
    if (favoriteGiftIds.indexOf(item.id) >= 0) record.knownFavoriteIds = normalizeCompanionKnownGiftIds(record.knownFavoriteIds, [item.id]);
    if (dislikedGiftIds.indexOf(item.id) >= 0) record.knownDislikedIds = normalizeCompanionKnownGiftIds(record.knownDislikedIds, [item.id]);
    record.knownFavorite = favoriteGiftIds.length > 0 && record.knownFavoriteIds.length >= favoriteGiftIds.length;
    record.knownDislike = dislikedGiftIds.length > 0 && record.knownDislikedIds.length >= dislikedGiftIds.length;
    spendGold(item.price);
    state.totalCompanionGiftsSent = Math.max(0, Number(state.totalCompanionGiftsSent) || 0) + 1;
    addLog("你给“" + companion.name + "”送出了“" + item.name + "”。");
    const gain = companionAffinityGainByGift(item, companion);
    const affectionResult = applyCompanionAffectionGain(
      companionId,
      gain,
      companion.name + " 收下了“" + item.name + "”。",
      {
        revealFavoriteItemId: revealFavorite ? item.id : null,
        revealDislikeItemId: revealDislike ? item.id : null
      }
    );
    setModal(null);
    showTreasure(
      affectionResult.rewardEntries[0] ? affectionResult.rewardEntries[0].label : ("+" + gain + " 好感"),
      companion.name + " 收下了你的礼物。",
      affectionResult.rewardEntries,
      companion.name + " 收下了礼物"
    );
    saveState();
    renderApp();
  }

  function ensureAchievementsState(targetState) {
    const safeState = targetState;
    if (!safeState.achievements || typeof safeState.achievements !== "object") safeState.achievements = { unlocked: {}, recentIds: [] };
    if (!safeState.achievements.unlocked) safeState.achievements.unlocked = {};
    if (!Array.isArray(safeState.achievements.recentIds)) safeState.achievements.recentIds = [];
    return safeState.achievements;
  }

  function activeAchievements() {
    return ensureAchievementsState(state);
  }

  function unlockAchievementOnState(targetState, id, silent) {
    const achievements = ensureAchievementsState(targetState);
    if (achievements.unlocked[id]) return false;
    const now = Date.now();
    achievements.unlocked[id] = { unlockedAt: now, claimed: false };
    achievements.recentIds = [id].concat(achievements.recentIds.filter(function (value) { return value !== id; }));
    if (achievements.recentIds.length > 40) achievements.recentIds.length = 40;
    if (!silent) {
      const ach = achievementById(id);
      if (ach) queueToast("解锁成就：「" + ach.name + "」", "success");
    }
    return true;
  }

  function refreshSocialAchievements(targetState, silent) {
    const safeState = targetState || state;
    const silentUnlock = Boolean(silent);
    const hatchedCount = hatchedPetCountForState(safeState);
    if (hatchedCount >= 1) unlockAchievementOnState(safeState, "adventure_pet_hatched", silentUnlock);
    if (hatchedCount >= 3) unlockAchievementOnState(safeState, "collection_pet_3", silentUnlock);
    if (adultPetCountForState(safeState) >= 1) unlockAchievementOnState(safeState, "adventure_pet_adult", silentUnlock);
    const metCount = unlockedCompanionCount(safeState);
    if (metCount >= 1) unlockAchievementOnState(safeState, "social_first_companion", silentUnlock);
    if (metCount >= 5) unlockAchievementOnState(safeState, "social_companion_5", silentUnlock);
    if ((Number(safeState.totalCompanionGiftsSent) || 0) >= 3) unlockAchievementOnState(safeState, "social_gift_3", silentUnlock);
    const affinityLv3Count = companionsAtAffinityLevelCount(3, safeState);
    if (affinityLv3Count >= 1) unlockAchievementOnState(safeState, "social_affection_lv3_1", silentUnlock);
    if (affinityLv3Count >= 5) unlockAchievementOnState(safeState, "social_affection_lv3_5", silentUnlock);
  }

  function unlockAchievement(id) {
    unlockAchievementOnState(state, id, false);
  }

  function achievementById(id) {
    return ACHIEVEMENTS.find(function (a) { return a.id === id; }) || null;
  }

  function achievementRewardGold(achievement) {
    if (!achievement || !achievement.rewardText) return 0;
    const match = String(achievement.rewardText).match(/(\d+)/);
    const value = match ? Number(match[1]) : 0;
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function claimAchievementReward(id) {
    const achievements = activeAchievements();
    const info = achievements.unlocked && achievements.unlocked[id];
    if (!info || info.claimed) return;
    const ach = achievementById(id);
    const gold = achievementRewardGold(ach);
    if (gold > 0) addGold(gold);
    info.claimed = true;
    const title = ach && ach.rewardText ? ach.rewardText : "成就奖励";
    queueToast("已领取：" + title, "success");
    saveState();
    renderApp();
  }

  function drawAchievementIcon(targetCtx, x, y, size, achievement, unlocked, large) {
    const unit = size / 16;
    const colorMain = unlocked ? THEME.ink : "#777777";
    const colorAccent = unlocked ? THEME.yellow : "#bbbbbb";
    const cat = achievement.category;
    const px = function (gx, gy, gw, gh, color) {
      fillRect(targetCtx, x + gx * unit, y + gy * unit, gw * unit, gh * unit, color);
    };
    if (cat === "专注类") {
      // 小人头 + 心形
      px(5, 4, 6, 6, colorMain);
      px(4, 3, 2, 2, colorMain);
      px(10, 3, 2, 2, colorMain);
      px(3, 11, 10, 2, colorMain);
      px(11, 2, 3, 3, colorAccent);
    } else if (cat === "收集类") {
      // 宝箱
      px(3, 6, 10, 5, colorMain);
      px(3, 5, 10, 1, colorAccent);
      px(7, 8, 2, 3, THEME.paperSoft);
    } else if (cat === "冒险类") {
      // 小人 + 旗子
      px(4, 6, 4, 6, colorMain);
      px(4, 4, 4, 2, colorMain);
      px(2, 12, 8, 2, colorMain);
      px(10, 3, 1, 9, colorMain);
      px(11, 3, 3, 3, colorAccent);
    } else if (cat === "社交类") {
      // 两个小人 + 中间纽带
      px(2, 4, 4, 4, colorMain);
      px(10, 4, 4, 4, colorMain);
      px(1, 9, 5, 4, colorMain);
      px(10, 9, 5, 4, colorMain);
      px(6, 8, 4, 2, colorAccent);
      px(6, 10, 4, 1, colorAccent);
    } else {
      // 其他：星星
      px(7, 3, 2, 10, colorMain);
      px(3, 7, 10, 2, colorMain);
      px(5, 5, 6, 6, colorAccent);
    }
  }

  function signInToday() {
    if (state.todaySignedIn) return;
    if (state.todayStats.done <= 0) {
      setModal({ type: "hpWarning", reason: "signIn" });
      return;
    }
    state.todaySignedIn = true;
    state.totalSignInDays = (state.totalSignInDays || 0) + 1;
    addGold(10);
    showTreasure("+10 金币", "每日签到奖励。");
    if ((state.totalSignInDays || 0) >= 7) unlockAchievement("misc_daily_signin_7");
    saveState();
    renderApp();
  }

  function showTaskRewardChest(taskTitle, subtitle, rewards) {
    setModal({
      type: "treasure",
      phase: "chest",
      title: "任务宝箱",
      rewardLabel: "完成“" + taskTitle + "”",
      subtitle: subtitle,
      rewards: rewards
    });
  }

  function advanceTreasureModal() {
    if (!state.modal || state.modal.type !== "treasure") return;
    if ((state.modal.phase || "rewards") === "chest") {
      state.modal.phase = "rewards";
      saveState();
      renderApp();
      return;
    }
    setModal(null);
  }

  function advanceBoss() {
    state.bossIndex = (state.bossIndex + 1) % BOSS_ROTATION.length;
    const template = currentBossTemplate();
    state.boss = { id: template.id, hp: template.maxHp, maxHp: template.maxHp };
    state.bossDeadlineAt = template && template.timeLimitHours ? Date.now() + template.timeLimitHours * 3600000 : null;
    addLog("新的 Boss " + template.name + " 出现了。");
    unlockCodexEntry("boss", template.id, template.name, null);
  }

  function isAdventureOnlyScene(item) {
    return item && item.category === "background" && item.shopVisible === false;
  }

  function rollBossLootRarity(bossLevel) {
    const table = BOSS_LOOT_BY_LEVEL[Math.min(5, Math.max(1, bossLevel || 1))] || BOSS_LOOT_BY_LEVEL[1];
    let r = Math.random();
    for (let i = 0; i < table.length; i++) {
      r -= table[i].p;
      if (r <= 0) return table[i].r;
    }
    return table[table.length - 1].r;
  }

  function rewardFromBoss(bossTemplate) {
    const bossLevel = (bossTemplate && bossTemplate.level) || 1;
    const targetRarity = rollBossLootRarity(bossLevel);
    const candidates = SHOP_CATALOG.filter(function (item) {
      if (isOwnedCatalogItem(item)) return false;
      if (isAdventureOnlyScene(item)) return false;
      // Boss 宝箱不参与掉落任何宠物蛋（避免掉到非本 Boss 关联的蛋）
      if (item && item.category === "petEgg") return false;
      return itemRarityLabel(item) === targetRarity;
    });
    if (candidates.length === 0) {
      const fallback = SHOP_CATALOG.filter(function (item) {
        if (isOwnedCatalogItem(item)) return false;
        if (isAdventureOnlyScene(item)) return false;
        if (item && item.category === "petEgg") return false;
        return true;
      });
      if (fallback.length === 0) {
        addGold(24);
        return [{ label: "+24 金币", detail: "Boss 宝箱里只有金币，但也不亏。" }];
      }
      const reward = pick(fallback);
      const granted = grantCatalogReward(reward.id, "Boss 宝箱");
      return granted ? [{ label: "获得 " + granted.label, detail: granted.subtitle }] : [];
    }
    const reward = pick(candidates);
    const granted = grantCatalogReward(reward.id, "Boss 宝箱");
    return granted ? [{ label: "获得 " + granted.label, detail: granted.subtitle }] : [];
  }

  function rewardBossEggIfMissing(bossTemplate) {
    if (!bossTemplate || !bossTemplate.id) return null;
    const map = {
      "delay-giant": "egg-alarm-beast",
      "night-ghost": "egg-day-ghost",
      "chaos-crow": "egg-tidy-crow",
    };
    const eggItemId = map[bossTemplate.id];
    if (!eggItemId) return null;
    const eggItem = catalogItemById(eggItemId);
    if (!eggItem) return null;
    // 只要还没拥有该宠物（= 没拿到这颗蛋/没孵出），每次击败都掉一次；拥有后不再掉
    if (isOwnedCatalogItem(eggItem)) return null;
    const granted = grantCatalogReward(eggItemId, bossTemplate.name + " 掉落");
    return granted ? { label: "获得 " + granted.label, detail: granted.subtitle } : null;
  }

  function dealBossDamage(amount, sourceTitle) {
    const rewardEntries = [];
    state.boss.hp = clamp(state.boss.hp - amount, 0, state.boss.maxHp);
    if (state.boss.hp > 0) return rewardEntries;
    const defeated = currentBossTemplate();
    const goldReward = 50 + state.bossIndex * 10;
    addGold(goldReward);
    rewardEntries.push({ label: "+" + goldReward + " 金币", detail: defeated.name + " 的 Boss 赏金。" });
    addLog("你击败了" + defeated.name + "，获得 " + goldReward + " 金币战利品。");
    const eggReward = rewardBossEggIfMissing(defeated);
    if (eggReward) rewardEntries.push(eggReward);
    rewardFromBoss(defeated).forEach(function (entry) { rewardEntries.push(entry); });
    state.bossDeadlineAt = null;
    state.totalBossDefeated = (state.totalBossDefeated || 0) + 1;
    unlockAchievement("adventure_first_boss");
    if ((state.totalBossDefeated || 0) >= 5) unlockAchievement("adventure_boss_5");
    advanceBoss();
    if (sourceTitle) setToast("Boss 被 " + sourceTitle + " 打倒了。", "success");
    return rewardEntries;
  }

  function taskBucketLabel(bucket) {
    const option = TASK_BUCKET_OPTIONS[bucket] || TASK_BUCKET_OPTIONS.todo;
    return option.logLabel;
  }

  function currentWindowScroll() {
    return {
      x: window.scrollX || window.pageXOffset || 0,
      y: window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
    };
  }

  function syncModalPageLock(shouldLock) {
    if (shouldLock) {
      if (!modalPageScrollLock) {
        const scroll = currentWindowScroll();
        modalPageScrollLock = scroll;
        document.body.style.position = "fixed";
        document.body.style.top = -scroll.y + "px";
        document.body.style.left = "0";
        document.body.style.right = "0";
        document.body.style.width = "100%";
      }
      document.documentElement.classList.add("modal-open");
      document.body.classList.add("modal-open");
      return;
    }
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
    if (!modalPageScrollLock) return;
    const scroll = modalPageScrollLock;
    modalPageScrollLock = null;
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    window.scrollTo(scroll.x || 0, scroll.y || 0);
  }

  function setModal(modal) {
    blurActiveInput();
    if (modal && modal.type === "editor") {
      if (typeof modal.scroll !== "number") modal.scroll = 0;
      if (!modal.choiceScrolls) modal.choiceScrolls = {};
    }
    state.modal = modal;
    overlayDrag = null;
    overlayScrollGesture = null;
    overlayCanvas.style.pointerEvents = modal ? "auto" : "none";
    overlayCanvas.style.touchAction = modal ? "none" : "auto";
    syncModalPageLock(Boolean(modal));
    saveState();
    renderApp();
  }

  function completeTask(taskId, fromPomodoro) {
    const taskIndex = state.tasks.findIndex(function (task) { return task.id === taskId; });
    if (taskIndex < 0) return;
    const task = state.tasks[taskIndex];
    if (task.bucket === "todo" && task.completed) {
      setToast("这个待办已经打勾完成了。", "info");
      renderApp();
      return;
    }
    const now = Date.now();
    if (state.challengeMode) {
      if (task.bucket === "habit" || task.bucket === "learn") {
        const last = Number(task.lastCompletedAt) || 0;
        if (last && now - last < 10 * 60 * 1000) {
          setToast("挑战模式下，同一个习惯/技能\n10 分钟内只能完成一次，不能作弊哦。", "danger");
          renderApp();
          return;
        }
      } else if (task.bucket === "todo") {
        const lastTodo = Number(state.lastTodoCompletedAt) || 0;
        if (lastTodo && now - lastTodo < 30 * 1000) {
          setToast("挑战模式下，完成两个待办的间隔\n需要不少于 30 秒，不能作弊哦。", "danger");
          renderApp();
          return;
        }
      }
    }
    const config = DIFFICULTIES[task.difficulty];
    if (!config) return;
    if (state.profile.hp < config.hpCost) {
      setModal({ type: "hpWarning" });
      return;
    }
    const bonusExp = fromPomodoro ? 6 : 0;
    const bonusGold = fromPomodoro ? 4 : 0;
    const bonusDamage = fromPomodoro ? 12 : 0;
    const bonusSlots = fromPomodoro ? 4 : 0;
    const beforeMood = currentHeroMood();
    const baseExp = config.exp + bonusExp;
    const gainedGold = config.gold + bonusGold;
    const gainedSlots = config.adventureGain + bonusSlots;
    const gainedExp = addExp(Math.round(baseExp * heroExpMultiplier()));
    addGold(gainedGold);
    loseHp(config.hpCost);
    state.profile.done += 1;
    state.totalCompletedTasks = (state.totalCompletedTasks || 0) + 1;
    state.todayStats.done += 1;
    ensureHistoryDay(state.todayStats.dayKey).done += 1;
    if (fromPomodoro) state.todayStats.pomo += 1;
    state.adventure.slots = clamp(state.adventure.slots + gainedSlots, 0, state.adventure.maxSlots);
    if (state.adventure.slots >= state.adventure.maxSlots) unlockAchievement("adventure_slots_max");
    const damage = config.bossDamage + bonusDamage;
    const bossRewards = dealBossDamage(damage, task.title);
    if (task.bucket === "todo") {
      task.completed = true;
      state.lastTodoCompletedAt = now;
    } else {
      task.completedToday = false;
      task.completedCount = Math.max(0, Number(task.completedCount) || 0) + 1;
      task.lastCompletedAt = now;
    }
    const todayKey = dayKey();
    if (state.lastCompletionDay !== todayKey) {
      // 以日期差为准：相差 1 天则连击 +1，否则重置为 1（避免 DST/时区/休眠导致误判）
      function parseDayKey(key) {
        const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d0 = Number(m[3]);
        if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d0)) return null;
        // 用本地时间“中午”构造日期，降低 DST 切换边界影响
        return new Date(y, mo - 1, d0, 12, 0, 0, 0);
      }
      const lastDate = parseDayKey(state.lastCompletionDay);
      const todayDate = parseDayKey(todayKey);
      const diffDays = (lastDate && todayDate) ? Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000) : null;
      if (diffDays === 1) state.profile.streak += 1;
      else state.profile.streak = 1;
      state.profile.totalStreakDays += 1;
      state.lastCompletionDay = todayKey;
    }
    if (state.profile.done >= 1) unlockAchievement("focus_first_task");
    if (state.profile.streak >= 3) unlockAchievement("focus_streak_3");
    if (state.profile.streak >= 7) unlockAchievement("focus_streak_7");
    if (state.profile.streak >= 30) unlockAchievement("focus_streak_30");
    if (fromPomodoro) unlockAchievement("focus_pomodoro_1");
    if ((state.totalCompletedTasks || 0) >= 10) unlockAchievement("focus_tasks_10");
    if ((state.totalCompletedTasks || 0) >= 50) unlockAchievement("focus_tasks_50");
    if ((state.totalCompletedTasks || 0) >= 100) unlockAchievement("focus_tasks_100");
    addLog("完成了“" + task.title + "”，获得 " + gainedExp + " EXP、" + gainedGold + " 金币，失去 " + config.hpCost + " HP，对 Boss 造成 " + damage + " 伤害。");
    const chestRewards = [
      { label: "+" + gainedExp + " EXP", detail: fromPomodoro ? "已包含番茄钟额外经验。" : "任务经验已经到账。" },
      { label: "+" + gainedGold + " 金币", detail: fromPomodoro ? "已包含番茄钟额外金币。" : "任务金币奖励。" },
      { label: "冒险槽 +" + gainedSlots, detail: "可以用于后续出发冒险。" }
    ];
    bossRewards.forEach(function (entry) { chestRewards.push(entry); });
    const bucketText = task.bucket === "todo" ? "待办完成后掉出了一只宝箱。" : task.bucket === "habit" ? "习惯打卡后掉出了一只宝箱。" : "技能学习后掉出了一只宝箱。";
    const afterMood = currentHeroMood();
    if (afterMood && beforeMood && afterMood.level !== beforeMood.level) {
      const direction = afterMood.level > beforeMood.level ? "提升到了" : "下降到";
      const moodText = "心情从「" + beforeMood.name + "」" + direction + "「" + afterMood.name + "」。";
      queueToast(moodText, "info");
    }
    showTaskRewardChest(task.title, bucketText, chestRewards);
  }

  function deleteTask(taskId) {
    state.tasks = state.tasks.filter(function (task) { return task.id !== taskId; });
    addLog("删除了一个任务卡片，准备重新规划节奏。");
    saveState();
    renderApp();
  }

  function completedTodoCount() {
    return state.tasks.filter(function (task) {
      return task.bucket === "todo" && task.completed;
    }).length;
  }

  function openDeleteCompletedTodoConfirm() {
    const count = completedTodoCount();
    if (count <= 0) {
      setToast("还没有已完成的 To-do。", "info");
      renderApp();
      return;
    }
    setModal({ type: "deleteCompletedTodoConfirm", count: count });
  }

  function deleteCompletedTodoTasks() {
    const count = completedTodoCount();
    if (count <= 0) {
      setModal(null);
      setToast("还没有已完成的 To-do。", "info");
      renderApp();
      return;
    }
    state.tasks = state.tasks.filter(function (task) {
      return !(task.bucket === "todo" && task.completed);
    });
    addLog("一键删除了 " + count + " 个已完成待办。");
    setToast("已删除 " + count + " 个已完成 To-do。", "success");
    setModal(null);
    saveState();
    renderApp();
  }

  function orderedTodoTasks(todoTasks) {
    const list = Array.isArray(todoTasks) ? todoTasks.slice() : [];
    if (state.todoSortMode !== "deadline") return list;
    return list
      .map(function (task, index) { return { task: task, index: index }; })
      .sort(function (left, right) {
        const leftDueAt = normalizeTimestamp(left.task && left.task.dueAt);
        const rightDueAt = normalizeTimestamp(right.task && right.task.dueAt);
        const leftHasDeadline = leftDueAt != null;
        const rightHasDeadline = rightDueAt != null;
        if (leftHasDeadline && !rightHasDeadline) return -1;
        if (!leftHasDeadline && rightHasDeadline) return 1;
        if (leftHasDeadline && rightHasDeadline && leftDueAt !== rightDueAt) return leftDueAt - rightDueAt;
        return left.index - right.index;
      })
      .map(function (entry) { return entry.task; });
  }

  function toggleTodoSortMode() {
    state.todoSortMode = state.todoSortMode === "deadline" ? "default" : "deadline";
    saveState();
    renderApp();
  }

  function heatmapBaseMonthDate() {
    const realToday = new Date();
    let year = realToday.getFullYear();
    let month = realToday.getMonth();
    if (typeof window !== "undefined" && window.HEATMAP_DEBUG_MONTH) {
      const debugMonth = Number(window.HEATMAP_DEBUG_MONTH) || 0;
      if (debugMonth >= 1 && debugMonth <= 12) {
        month = debugMonth - 1;
        if (window.HEATMAP_DEBUG_YEAR) {
          const debugYear = Number(window.HEATMAP_DEBUG_YEAR);
          if (Number.isFinite(debugYear) && debugYear >= 1970 && debugYear <= 9999) year = debugYear;
        }
      }
    }
    return new Date(year, month, 1);
  }

  function selectedJournalHistoryMonthDate() {
    const baseDate = heatmapBaseMonthDate();
    const offset = Math.max(0, Math.floor(Number(state.journalHistoryMonthOffset) || 0));
    return new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1);
  }

  function selectedJournalHistoryMonthLabel() {
    const date = selectedJournalHistoryMonthDate();
    return date.getFullYear() + "年" + (date.getMonth() + 1) + "月";
  }

  function shiftJournalHistoryMonth(delta) {
    const currentOffset = Math.max(0, Math.floor(Number(state.journalHistoryMonthOffset) || 0));
    state.journalHistoryMonthOffset = Math.max(0, currentOffset + delta);
    saveState();
    renderApp();
  }

  function openRenameTask(taskId) {
    const task = state.tasks.find(function (t) { return t.id === taskId; });
    if (!task) return;
    setModal({ type: "rename", target: "task", id: taskId, currentName: task.title });
    setTimeout(function () { if (state.modal && state.modal.type === "rename") activateInput("renameInput", false); }, 80);
  }

  function openRenameReward(rewardId) {
    const reward = state.rewards.find(function (r) { return r.id === rewardId; });
    if (!reward) return;
    setModal({ type: "rename", target: "reward", id: rewardId, currentName: reward.name });
    setTimeout(function () { if (state.modal && state.modal.type === "rename") activateInput("renameInput", false); }, 80);
  }

  function confirmRename() {
    const modal = state.modal;
    if (!modal || modal.type !== "rename") return;
    const value = (getFieldValue("renameInput") || "").trim();
    if (!value) {
      setToast("名称不能为空。", "danger");
      renderApp();
      return;
    }
    if (modal.target === "task") {
      const task = state.tasks.find(function (t) { return t.id === modal.id; });
      if (task) {
        task.title = value.slice(0, 20);
        addLog("修改了任务名：“" + modal.currentName + "” → “" + task.title + "”。");
      }
    } else if (modal.target === "reward") {
      const reward = state.rewards.find(function (r) { return r.id === modal.id; });
      if (reward) {
        reward.name = value.slice(0, 20);
        addLog("修改了奖励名：“" + modal.currentName + "” → “" + reward.name + "”。");
      }
    }
    setModal(null);
    saveState();
    renderApp();
  }

  function createTaskEntry() {
    const title = state.composer.taskTitle.trim();
    if (!title) {
      setToast("先写一个任务名。", "danger");
      renderApp();
      return;
    }
    const firstCreated = state.tasks.length === 0;
    state.tasks.push(createTask(title, state.composer.taskBucket, state.composer.taskDifficulty, false, false));
    state.composer.taskTitle = "";
    addLog("新增了一个" + taskBucketLabel(state.composer.taskBucket) + "：“" + title + "”。");
    setToast("任务已加入任务栏。", "success");
    if (firstCreated) unlockAchievement("misc_first_task_created");
    saveState();
    renderApp();
  }

  function createRewardEntry() {
    const rewardName = state.composer.rewardName.trim();
    const rewardPrice = Number(state.composer.rewardPrice || "0");
    if (!rewardName || !rewardPrice) {
      setToast("奖励名和价格都要填。", "danger");
      renderApp();
      return;
    }
    const firstCreated = state.rewards.length === 0;
    state.rewards.push(createReward(rewardName, rewardPrice));
    state.composer.rewardName = "";
    state.composer.rewardPrice = "20";
    addLog("新增了一个奖励：“" + rewardName + "”。");
    setToast("奖励已加入兑换区。", "success");
    if (firstCreated) unlockAchievement("misc_first_reward_created");
    saveState();
    renderApp();
  }

  function openCreateChallengeModal() {
    if (state.pureMode) {
      setToast("纯净模式下不能创建新内容，请专注完成任务。", "info");
      renderApp();
      return;
    }
    setModal(createCreateChallengeModal());
    setTimeout(function () { if (state.modal && state.modal.type === "createChallenge") activateInput("createChallengeTitle", false); }, 60);
    renderApp();
  }

  function openCreateRewardModal() {
    if (state.pureMode) {
      setToast("纯净模式下不能创建新内容，请专注完成任务。", "info");
      renderApp();
      return;
    }
    setModal({ type: "createReward", name: "", priceText: "20" });
    setTimeout(function () { if (state.modal && state.modal.type === "createReward") activateInput("createRewardName", false); }, 60);
    renderApp();
  }

  function confirmCreateChallenge() {
    const modal = state.modal;
    if (!modal || modal.type !== "createChallenge") return;
    ensureCreateChallengeModalDefaults(modal);
    const title = String(getFieldValue("createChallengeTitle") || "").trim();
    if (!title) {
      setToast("先写一个挑战名称。", "danger");
      renderApp();
      return;
    }
    const bucket = TASK_BUCKET_OPTIONS[modal.bucket] ? modal.bucket : "todo";
    const difficulty = DIFFICULTIES[modal.difficulty] ? modal.difficulty : "normal";
    const deadlineResult = resolveCreateChallengeDueAt(modal);
    if (deadlineResult.error) {
      setToast(deadlineResult.error, "danger");
      renderApp();
      return;
    }
    const firstCreated = state.tasks.length === 0;
    state.tasks.push(createTask(title, bucket, difficulty, false, false, { dueAt: deadlineResult.dueAt }));
    const deadlineLogText = bucket === "todo"
      ? (deadlineResult.dueAt == null ? "，无截止日期" : "，截止于 " + formatDateTimeLabel(deadlineResult.dueAt))
      : "";
    addLog("新增了一个" + taskBucketLabel(bucket) + "：“" + title + "”" + deadlineLogText + "。");
    setToast("挑战已加入任务栏。", "success");
    setModal(null);
    if (firstCreated) unlockAchievement("misc_first_task_created");
    saveState();
    renderApp();
  }

  function confirmCreateReward() {
    const modal = state.modal;
    if (!modal || modal.type !== "createReward") return;
    const name = String(getFieldValue("createRewardName") || "").trim();
    const price = Number(getFieldValue("createRewardPrice") || "0");
    if (!name || !price) {
      setToast("奖励名和价格都要填。", "danger");
      renderApp();
      return;
    }
    const firstCreated = state.rewards.length === 0;
    state.rewards.push(createReward(name, price));
    addLog("新增了一个奖励：“" + name + "”。");
    setToast("奖励已加入兑换区。", "success");
    setModal(null);
    if (firstCreated) unlockAchievement("misc_first_reward_created");
    saveState();
    renderApp();
  }

  function exchangeReward(rewardId) {
    const reward = state.rewards.find(function (entry) { return entry.id === rewardId; });
    if (!reward) return;
    if (state.profile.gold < reward.price) {
      setToast("金币还不够。", "danger");
      renderApp();
      return;
    }
    spendGold(reward.price);
    addLog("兑换了奖励“" + reward.name + "”。");
    setToast("奖励已兑换，去现实里领奖吧。", "success");
    saveState();
    renderApp();
  }

  function deleteReward(rewardId) {
    const index = state.rewards.findIndex(function (entry) { return entry.id === rewardId; });
    if (index < 0) return;
    const removed = state.rewards.splice(index, 1)[0];
    addLog("删除了奖励“" + removed.name + "”。");
    setToast("奖励已删除。", "success");
    saveState();
    renderApp();
  }

  function useSupply(itemId) {
    const item = catalogItemById(itemId);
    if (!isSupplyItem(item)) return;
    if (supplyCount(itemId) <= 0) {
      setToast("这份补给已经没有库存了。", "info");
      renderApp();
      return;
    }
    if (state.profile.hp >= state.profile.maxHp) {
      setToast("HP 已经满了，先留着以后再用吧。", "info");
      renderApp();
      return;
    }
    const beforeMood = currentHeroMood();
    const healedValue = Math.min(Number(item.hp) || 0, Math.max(0, state.profile.maxHp - state.profile.hp));
    consumeSupply(itemId, 1);
    healHp(item.hp);
    addLog("你使用了补给“" + item.name + "”，恢复了 " + healedValue + " HP。");
    setToast(item.name + " 生效了。", "success");
    if (!activeAchievements().unlocked || !activeAchievements().unlocked.misc_first_rest) unlockAchievement("misc_first_rest");
    if (item.id === "supply-energy-potion") unlockAchievement("misc_rest_chill");
    const afterMood = currentHeroMood();
    if (afterMood && beforeMood && afterMood.level !== beforeMood.level) {
      const direction = afterMood.level > beforeMood.level ? "提升到了" : "变化为了";
      const moodText = "心情从「" + beforeMood.name + "」" + direction + "「" + afterMood.name + "」。";
      queueToast(moodText, "info");
    }
    saveState();
    renderApp();
  }

  function sellSupply(itemId) {
    const item = catalogItemById(itemId);
    if (!isSupplyItem(item)) return;
    if (supplyCount(itemId) <= 0) {
      setToast("这份补给已经卖空了。", "info");
      renderApp();
      return;
    }
    const gold = supplySellPrice(item);
    consumeSupply(itemId, 1);
    addGold(gold);
    addLog("你卖掉了补给“" + item.name + "”，换回了 " + gold + " 金币。");
    setToast("已卖出 “" + item.name + "”。", "success");
    saveState();
    renderApp();
  }

  function purchaseCatalog(itemId) {
    const item = catalogItemById(itemId);
    if (!item) return;
    if (item.purchaseMode === "drop") {
      setToast("\u8fd9\u4e2a\u80cc\u666f\u9700\u8981\u53bb\u5bf9\u5e94\u573a\u666f\u5192\u9669\u6389\u843d\u3002", "info");
      renderApp();
      return;
    }
    if (isSupplyItem(item)) {
      if (state.profile.gold < item.price) {
        setToast("金币不足。", "danger");
        renderApp();
        return;
      }
      spendGold(item.price);
      state.shopPurchases = (state.shopPurchases || 0) + 1;
      const granted = grantCatalogReward(item.id, "商店");
      if (granted) showTreasure(granted.label, granted.subtitle);
      addLog("购买了补给“" + item.name + "”。");
      if ((state.shopPurchases || 0) >= 3) unlockAchievement("collection_shop_3");
      if ((state.shopPurchases || 0) >= 10) unlockAchievement("collection_shop_10");
      if ((state.shopPurchases || 0) >= 30) unlockAchievement("collection_shop_30");
      saveState();
      renderApp();
      return;
    }
    if (isOwnedCatalogItem(item)) {
      if (item.category === "accessory" && isEquippedCatalogItem(item)) {
        // 取消装备（配饰支持点击“取消装备”）
        let list = currentAccessories(state.profile.appearance);
        const idx = list.indexOf(item.unlockValue);
        if (idx >= 0) {
          list.splice(idx, 1);
          state.profile.appearance.accessories = list;
        }
        addLog("取消装备了“" + item.name + "”。");
        setToast("已取消装备。", "success");
        saveState();
        renderApp();
        return;
      }
      if (item.category === "item" && isEquippedCatalogItem(item)) {
        const v = item.unlockValue;
        if (v !== "无") {
          if (state.profile.appearance.weaponLeft === v) state.profile.appearance.weaponLeft = "无";
          if (state.profile.appearance.weaponRight === v) state.profile.appearance.weaponRight = "无";
        } else {
          state.profile.appearance.weaponLeft = "无";
          state.profile.appearance.weaponRight = "无";
        }
        state.profile.appearance.weapon = state.profile.appearance.weaponRight || "无";
        addLog("取消装备了“" + item.name + "”。");
        setToast("已取消装备。", "success");
        saveState();
        renderApp();
        return;
      }
      equipCatalogItem(item);
      addLog("把“" + item.name + "”切换成了当前装备。");
      setToast("已切换装备。", "success");
      saveState();
      renderApp();
      return;
    }
    if (state.profile.gold < item.price) {
      setToast("金币不足。", "danger");
      renderApp();
      return;
    }
    spendGold(item.price);
    state.shopPurchases = (state.shopPurchases || 0) + 1;
    const granted = grantCatalogReward(item.id, "商店");
    if (granted) showTreasure(granted.label, granted.subtitle);
    addLog("购买了“" + item.name + "”。");
    if ((state.shopPurchases || 0) >= 3) unlockAchievement("collection_shop_3");
    if ((state.shopPurchases || 0) >= 10) unlockAchievement("collection_shop_10");
    if ((state.shopPurchases || 0) >= 30) unlockAchievement("collection_shop_30");
    saveState();
    renderApp();
  }

  function startPetIncubation() {
    const pet = currentPet();
    if (!pet || !pet.isEgg || pet.incubationStartedAt) return;
    pet.incubationStartedAt = Date.now();
    pet.incubationEndsAt = pet.incubationStartedAt + pet.incubationMinutes * 60 * 1000;
    addLog("开始孵化“" + petDisplayName(pet) + "”，预计 " + pet.incubationMinutes + " 分钟后破壳。");
    setToast("宠物蛋开始孵化了。", "success");
    saveState();
    renderApp();
  }

  function instantHatchPet() {
    const pet = currentPet();
    if (!pet || !pet.isEgg) return;
    const price = petInstantHatchCost(pet);
    if (state.profile.gold < price) {
      setToast("金币不够，暂时无法一键孵化。", "danger");
      renderApp();
      return;
    }
    spendGold(price);
    finishHatching(pet, "金币加速");
    saveState();
    renderApp();
  }

  function carePet(actionId) {
    const pet = currentPet();
    const option = PET_CARE_OPTIONS.find(function (entry) { return entry.id === actionId; });
    if (!pet || !option || pet.isEgg) return;
    if (pet.stage >= PET_STAGES.length - 1) {
      setToast("它已经是完全体了。", "info");
      renderApp();
      return;
    }
    if (state.profile.gold < option.price) {
      setToast("金币不够，先做点任务吧。", "danger");
      renderApp();
      return;
    }
    spendGold(option.price);
    const evolved = applyPetGrowth(pet, option.growth);
    addLog("你为“" + pet.name + "”进行了“" + option.name + "”，成长条增加了 " + option.growth + " 点。");
    setToast(evolved ? pet.name + " 成长到了新的阶段。" : option.name + " 生效了。", "success");
    saveState();
    renderApp();
  }

  function updatePetTimers() {
    let changed = false;
    state.pets.forEach(function (pet) {
      if (!pet || !pet.isEgg || !pet.incubationStartedAt || !pet.incubationEndsAt) return;
      const remaining = Math.max(0, Math.ceil((pet.incubationEndsAt - Date.now()) / 60000));
      if (pet._lastRemaining !== remaining) {
        pet._lastRemaining = remaining;
        changed = true;
      }
      if (remaining === 0) {
        finishHatching(pet, "等待完成");
        changed = true;
      }
    });
    return changed;
  }

  function setFollowPet(petId) {
    state.currentPetId = petId;
    addLog("\u628a\u5f53\u524d\u57f9\u517b\u5ba0\u7269\u5207\u6362\u6210\u4e86\u201c" + currentPet().name + "\u201d\u3002");
    saveState();
    renderApp();
  }

  function setCurrentPetDisplayForm(value) {
    const pet = currentPet();
    if (!pet || pet.isEgg) return;
    if (value === "egg") pet.displayForm = "egg";
    else pet.displayForm = clamp(Number(value) || 0, 0, pet.stage);
    saveState();
    renderApp();
  }

  function buildTripReward(location) {
    // 先确定当前场景的稀有度，用于决定金币区间与可掉落物品
    const backgroundItem = location.backgroundRewardId ? catalogItemById(location.backgroundRewardId) : null;
    const sceneRarity = itemRarityLabel(backgroundItem) || "廉价";
    const rarityIndex = Math.max(0, ITEM_RARITY_LEVELS.indexOf(sceneRarity));
    const goldRange = ADVENTURE_RARITY_GOLD_RANGES[sceneRarity] || ADVENTURE_RARITY_GOLD_RANGES["廉价"];

    // 可能的掉落类型：场景 / 物品 / 金币（三选一）
    // 1）场景：沿用原本的背景掉落逻辑，但改为互斥掉落
    if (backgroundItem && !isOwnedCatalogItem(backgroundItem) && Math.random() < adventureBackgroundDropChance(location.id)) {
      return { type: "scene", gold: 0, lootId: backgroundItem.id };
    }

    // 2）物品：从全局商店中找出满足稀有度条件的物品（非背景、非宠物蛋）
    const maxRarityIndex = rarityIndex;
    const minRarityIndex = Math.max(0, rarityIndex - 1);
    const candidateItems = SHOP_CATALOG.filter(function (item) {
      if (!item) return false;
      if (item.category === "background" || item.category === "petEgg") return false;
      const r = itemRarityLabel(item);
      const idx = ITEM_RARITY_LEVELS.indexOf(r);
      if (idx < 0) return false;
      return idx >= minRarityIndex && idx <= maxRarityIndex;
    });

    // 以一定概率尝试掉落物品；如果没有合适物品候选，则退回金币
    if (candidateItems.length && Math.random() < 0.55) {
      const chosen = pick(candidateItems);
      return { type: "item", gold: 0, lootId: chosen.id };
    }

    // 3）金币：根据场景稀有度给出一个区间内的随机值
    const gold = randomInt(goldRange.min, goldRange.max);
    return { type: "gold", gold: gold, lootId: null };
  }

  function flappyCoinMultiplierForLocation(location) {
    // 飞行挑战金币结算倍率：按场景稀有度递增（整体下调，避免小游戏金币过高）
    const backgroundItem = location && location.backgroundRewardId ? catalogItemById(location.backgroundRewardId) : null;
    const sceneRarity = itemRarityLabel(backgroundItem) || "廉价";
    const idx = Math.max(0, ITEM_RARITY_LEVELS.indexOf(sceneRarity)); // 廉价=0, 普通=1...
    return 7 + idx;
  }

  function flappyTargetScoreForLocation(location) {
    // 稀有度越高目标越高（影响“额外奖品”触发）
    const backgroundItem = location && location.backgroundRewardId ? catalogItemById(location.backgroundRewardId) : null;
    const sceneRarity = itemRarityLabel(backgroundItem) || "廉价";
    const idx = Math.max(0, ITEM_RARITY_LEVELS.indexOf(sceneRarity));
    return 8 + idx * 2;
  }

  function flappyTierOptionsForLocation(location) {
    const base = flappyTargetScoreForLocation(location);
    return [
      { id: "tier1", label: "新手", target: base, bonusRolls: 1 },
      { id: "tier2", label: "进阶", target: base * 2, bonusRolls: 2 },
      { id: "tier3", label: "极限", target: base * 4, bonusRolls: 3 },
    ];
  }

  function flappyPipePaletteForLocation(location) {
    // 固定配色表：按场景手工指定（pipe 为主体，edge 为更深的边缘）
    const locationId = String(location && location.id ? location.id : "default");
    const fixed = {
      // 薄雾草甸：深绿色
      "misty-meadow": { pipe: "#2f6b3f", edge: "#1f4a2b" },
      // 午后街角：深棕色
      "street-corner": { pipe: "#6b4a2f", edge: "#4a321f" },
      // 静默书库：橘色（不要太亮）
      "quiet-library": { pipe: "#b36a2a", edge: "#7a451c" },
      // 潮汐海岸：深蓝色
      "tide-coast": { pipe: "#2b4f8c", edge: "#1b345f" },
      // 旧日遗迹：黑色（偏灰）
      "old-ruins": { pipe: "#3a3a3a", edge: "#1f1f1f" },
      // 樱花深巷：深绿色（但与薄雾草甸不同）
      "sakura-lane": { pipe: "#2f6b5a", edge: "#1f4a3e" },
      // 落雪驿站：蓝色
      "snow-station": { pipe: "#3f7ed8", edge: "#275199" },
      // 极光边境：粉色
      "aurora-edge": { pipe: "#c06aa0", edge: "#7f3f6a" },
    };
    if (fixed[locationId]) return fixed[locationId];

    // 兜底：每个场景生成一套唯一配色（保证不同场景柱子颜色不重复）
    const id = locationId;
    let h = 0;
    for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 360;
    // 控制在偏暗的“柱子色”，并给边缘更深一档
    const s = 42;
    const l = 32;
    function hslToHex(hh, ss, ll) {
      const s0 = ss / 100;
      const l0 = ll / 100;
      const c = (1 - Math.abs(2 * l0 - 1)) * s0;
      const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
      const m = l0 - c / 2;
      let r = 0, g = 0, b = 0;
      if (hh < 60) { r = c; g = x; b = 0; }
      else if (hh < 120) { r = x; g = c; b = 0; }
      else if (hh < 180) { r = 0; g = c; b = x; }
      else if (hh < 240) { r = 0; g = x; b = c; }
      else if (hh < 300) { r = x; g = 0; b = c; }
      else { r = c; g = 0; b = x; }
      const rr = Math.round((r + m) * 255);
      const gg = Math.round((g + m) * 255);
      const bb = Math.round((b + m) * 255);
      const hex = function (v) { return v.toString(16).padStart(2, "0"); };
      return "#" + hex(rr) + hex(gg) + hex(bb);
    }
    const pipe = hslToHex(h, s, l);
    const edge = hslToHex(h, s + 8, Math.max(14, l - 14));
    return { pipe: pipe, edge: edge };
  }

  function openFlappyForLocation(locationId) {
    const location = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === locationId; });
    if (!location) return;
    const unlockLevel = Math.max(1, Number(location.unlockLevel) || 1);
    if ((state.profile.level || 1) < unlockLevel) {
      setToast("达到 Lv" + unlockLevel + " 解锁“" + location.name + "”。", "info");
      renderApp();
      return;
    }
    const slotCost = Math.max(1, Math.ceil((Number(location.cost) || 1) / 2));
    if (state.adventure.slots < slotCost) {
      setToast("冒险槽不够，先去做任务补充吧。", "danger");
      renderApp();
      return;
    }
    // 进入小游戏前校验宠物条件：
    // 1）至少拥有一只已孵化宠物（幼年及以上，蛋不算）
    // 2）当前携带的宠物展示形态不能是蛋（无论本体是否已孵化）
    const hasHatchedPet = Array.isArray(state.pets) && state.pets.some(function (pet) {
      return pet && !pet.isEgg;
    });
    const pet = currentPet();
    if (!hasHatchedPet) {
      setToast("请先孵化一只宠物！", "info");
      renderApp();
      return;
    }
    if (!pet || petDisplayFormValue(pet) === "egg") {
      setToast("请携带一只已孵化的宠物进行游戏！", "info");
      renderApp();
      return;
    }
    setModal({
      type: "flappy",
      locationId: location.id,
      locationName: location.name,
      scene: location.scene,
      slotCost: slotCost,
      coinMultiplier: flappyCoinMultiplierForLocation(location),
      tierId: null,
      tierLabel: null,
      targetScore: null,
      bonusRolls: 0,
      phase: "select",
      spentSlotsThisRun: false,
      score: 0,
      coinCount: 0,
      birdY: 0,
      birdV: 0,
      pipes: [],
      lastTick: 0,
    });
  }

  function currentAdventureTrip() {
    const trip = state && state.adventure ? state.adventure.activeTrip : null;
    if (!trip || typeof trip !== "object") return null;
    if (!trip.locationId || !Number.isFinite(Number(trip.endsAt))) return null;
    return trip;
  }

  function isAdventureTripReady(trip) {
    return Boolean(trip) && Date.now() >= Number(trip.endsAt);
  }

  function adventureSkipCost(trip) {
    if (!trip || !trip.locationId) return 0;
    const location = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === trip.locationId; });
    const slotCost = Math.max(0, Number(location && location.cost) || 0);
    return slotCost * 2;
  }

  function buildAdventureStory(location, trip) {
    const companion = trip && trip.encounterCompanionId ? companionById(trip.encounterCompanionId) : null;
    if (companion) return buildCompanionAdventureStory(companion, location);
    const sceneLabel = String((location && (location.scene || location.name)) || (trip && trip.locationName) || "这趟旅途");
    const pool = ADVENTURE_STORY_LIBRARY[location && location.id ? location.id : ""] || ADVENTURE_STORY_FALLBACKS;
    const picked = pool.length ? pool[randomInt(0, pool.length - 1)] : ADVENTURE_STORY_FALLBACKS[0];
    return String(picked).replace(/\{scene\}/g, sceneLabel);
  }

  function settleAdventureTrip(trip, options) {
    const settings = options || {};
    if (!trip) return false;
    const location = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === trip.locationId; });
    if (!location) {
      state.adventure.activeTrip = null;
      return false;
    }
    const rewardEntries = [];
    function pushRewardEntry(label, detail) {
      if (!label) return;
      rewardEntries.push({ label: label, detail: detail || "" });
    }
    state.adventure.locationRuns[location.id] = adventureRunCount(location.id) + 1;
    const reward = buildTripReward(location);
    state.todayStats.trips += 1;
    state.totalCompletedTrips = (state.totalCompletedTrips || 0) + 1;
    unlockAchievement("adventure_first_trip");
    if ((state.totalCompletedTrips || 0) >= 5) unlockAchievement("adventure_trips_5");
    if ((state.totalCompletedTrips || 0) >= 20) unlockAchievement("adventure_trips_20");
    // 任意地点累计 5 次
    const anyMastered = ADVENTURE_LOCATIONS.some(function (loc) {
      return adventureRunCount(loc.id) >= 5;
    });
    if (anyMastered) unlockAchievement("adventure_all_locations_once");

    if (reward.type === "gold") {
      // 纯金币奖励
      addGold(reward.gold);
      addLog("\u4ece\u201c" + trip.locationName + "\u201d\u5f52\u6765\uff0c\u5e26\u56de\u4e86 " + reward.gold + " \u91d1\u5e01\u3002");
      if (settings.toastOnly) {
        setToast("\u4e0a\u4e00\u6b21\u5192\u9669\u5df2\u7ed3\u7b97\uff1a" + reward.gold + " \u91d1\u5e01", "success");
      } else {
        pushRewardEntry(reward.gold + " 金币", "这次冒险主要带回了金币奖励。");
      }
    } else if (reward.lootId) {
      // 物品或场景奖励（一次只掉一样），金币由 grantCatalogReward 内部处理重复折算
      const granted = grantCatalogReward(reward.lootId, trip.locationName);
      if (granted) {
        addLog("\u4ece\u201c" + trip.locationName + "\u201d\u5f52\u6765\uff0c\u542b\u7a7a\u624b\u88c5\u4e00\u4ef6\u201c" + granted.label + "\u201d\u3002");
        if (settings.toastOnly) setToast("\u4e0a\u4e00\u6b21\u5192\u9669\u5df2\u7ed3\u7b97\uff1a" + granted.label, "success");
        else pushRewardEntry(granted.label, granted.subtitle);
      } else {
        // 极少数情况下（例如找不到物品）退回金币奖励
        const fallbackGold = reward.gold || 24;
        addGold(fallbackGold);
        addLog("\u4ece\u201c" + trip.locationName + "\u201d\u5f52\u6765\uff0c\u5e26\u56de\u4e86 " + fallbackGold + " \u91d1\u5e01\u3002");
        if (settings.toastOnly) setToast("\u4e0a\u4e00\u6b21\u5192\u9669\u5df2\u7ed3\u7b97\uff1a" + fallbackGold + " \u91d1\u5e01", "success");
        else pushRewardEntry(fallbackGold + " 金币", "未找到可掉落的道具，转而获得了金币奖励。");
      }
    } else {
      // 理论上不会走到这里，兜底给一点金币
      const fallbackGold = reward.gold || 20;
      addGold(fallbackGold);
      addLog("\u4ece\u201c" + trip.locationName + "\u201d\u5f52\u6765\uff0c\u5e26\u56de\u4e86 " + fallbackGold + " \u91d1\u5e01\u3002");
      if (settings.toastOnly) setToast("\u4e0a\u4e00\u6b21\u5192\u9669\u5df2\u7ed3\u7b97\uff1a" + fallbackGold + " \u91d1\u5e01", "success");
      else pushRewardEntry(fallbackGold + " 金币", "这次冒险主要带回了金币奖励。");
    }

    const encounterCompanion = trip.encounterCompanionId ? companionById(trip.encounterCompanionId) : null;
    if (encounterCompanion) {
      const companionResult = settleCompanionEncounter(
        encounterCompanion.id,
        location,
        "在“" + location.name + "”的相遇让你们变得更熟悉了一点。"
      );
      if (settings.toastOnly) {
        queueToast("你遇见了伙伴“" + encounterCompanion.name + "”。", "success");
      } else {
        companionResult.rewardEntries.forEach(function (entry) {
          pushRewardEntry(entry.label, entry.detail);
        });
      }
    }
    state.adventure.activeTrip = null;
    if (!settings.toastOnly) {
      const firstEntry = rewardEntries[0] || { label: "冒险结算", detail: "这次冒险顺利结束了。" };
      showTreasure(firstEntry.label, firstEntry.detail, rewardEntries, encounterCompanion ? "冒险结算" : "你获得了奖励");
    }
    return true;
  }

  function startAdventure(locationId) {
    const location = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === locationId; });
    if (!location) return;
    const unlockLevel = Math.max(1, Number(location.unlockLevel) || 1);
    if ((state.profile.level || 1) < unlockLevel) {
      setToast("达到 Lv" + unlockLevel + " 解锁“" + location.name + "”。", "info");
      renderApp();
      return;
    }
    const activeTrip = currentAdventureTrip();
    if (activeTrip) {
      if (!isAdventureTripReady(activeTrip)) {
        setToast("\u5df2\u7ecf\u6709\u4e00\u6b21\u5192\u9669\u5728\u8fdb\u884c\u4e2d\u4e86\u3002", "info");
        renderApp();
        return;
      }
      settleAdventureTrip(activeTrip, { toastOnly: true });
    }
    if (state.adventure.slots < location.cost) {
      setToast("\u5192\u9669\u69fd\u4e0d\u591f\uff0c\u5148\u53bb\u505a\u4efb\u52a1\u3002", "danger");
      renderApp();
      return;
    }
    state.adventure.slots -= location.cost;
    const encounterCompanion = rollAdventureEncounterCompanion(location.id);
    state.adventure.activeTrip = {
      locationId: location.id,
      locationName: location.name,
      encounterCompanionId: encounterCompanion ? encounterCompanion.id : null,
      startedAt: Date.now(),
      endsAt: Date.now() + location.minutes * 60 * 1000,
    };
    addLog("\u4f60\u51fa\u53d1\u524d\u5f80\u201c" + location.name + "\u201d\u63a2\u7d22\uff0c\u6d88\u8017\u4e86 " + location.cost + " \u5192\u9669\u69fd\u3002");
    setToast("\u5df2\u7ecf\u51fa\u53d1\uff0c\u8bb0\u5f97\u56de\u6765\u9886\u53d6\u6218\u5229\u54c1\u3002", "success");
    saveState();
    renderApp();
  }

  function collectAdventure() {
    const trip = currentAdventureTrip();
    if (!trip || !isAdventureTripReady(trip)) return;
    const location = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === trip.locationId; });
    const companion = trip.encounterCompanionId ? companionById(trip.encounterCompanionId) : null;
    setModal({
      type: "adventureStory",
      locationId: trip.locationId,
      locationName: location && location.name ? location.name : trip.locationName,
      companionId: companion ? companion.id : null,
      sceneName: location && location.scene ? location.scene : trip.locationName,
      story: buildAdventureStory(location, trip)
    });
  }

  function skipAdventure() {
    const trip = currentAdventureTrip();
    if (!trip || isAdventureTripReady(trip)) return;
    const location = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === trip.locationId; });
    if (!location) {
      state.adventure.activeTrip = null;
      saveState();
      renderApp();
      return;
    }
    const skipCost = adventureSkipCost(trip);
    if (state.profile.gold < skipCost) {
      setToast("金币不够，暂时无法跳过这次冒险。", "danger");
      renderApp();
      return;
    }
    spendGold(skipCost);
    trip.endsAt = Date.now();
    addLog("你花费了 " + skipCost + " 金币，跳过了“" + trip.locationName + "”的剩余旅程。");
    setToast("已花费 " + skipCost + " 金币，当前冒险可直接领取战利品。", "success");
    saveState();
    renderApp();
  }

  function acknowledgeAdventureStory() {
    if (!state.modal || state.modal.type !== "adventureStory") return;
    const trip = currentAdventureTrip();
    state.modal = null;
    overlayCanvas.style.pointerEvents = "none";
    if (!trip || !isAdventureTripReady(trip)) {
      setToast("这次冒险已经结算完毕了。", "info");
      saveState();
      renderApp();
      return;
    }
    settleAdventureTrip(trip);
    saveState();
    renderApp();
  }

  function cycleValue(list, current) {
    const index = list.indexOf(current);
    return list[index < 0 ? 0 : (index + 1) % list.length];
  }

  function cycleDifficulty(fieldKey) {
    state.composer[fieldKey] = cycleValue(DIFFICULTY_ORDER, state.composer[fieldKey]);
    saveState();
    renderApp();
  }

  function cycleComposerBucket() {
    state.composer.taskBucket = cycleValue(TASK_BUCKET_ORDER, state.composer.taskBucket);
    saveState();
    renderApp();
  }

  function cycleAppearance(list, key) {
    state.profile.appearance[key] = cycleValue(list, state.profile.appearance[key]);
    saveState();
    renderApp();
  }

  function equipAppearanceFromCollection(key, value) {
    if (key === "accessory") {
      if (value === "无") {
        state.profile.appearance.accessories = ["无"];
        state.profile.appearance.accessory = "无";
        saveState();
        renderApp();
        return;
      }
      let list = currentAccessories(state.profile.appearance);
      // 装备任意配饰时，“无”不应保持被选中
      if (value !== "无") list = list.filter(function (v) { return v !== "无"; });
      const idx = list.indexOf(value);
      if (idx >= 0) {
        list.splice(idx, 1);
        state.profile.appearance.accessories = list;
      } else {
        // 冲突则替换：先移除所有与 value 像素重合的配饰，再装备新配饰
        const conflicts = list.filter(function (existing) {
          return accessoryOverlapsWithList(value, [existing]);
        });
        if (conflicts.length) {
          const next = list.filter(function (existing) { return conflicts.indexOf(existing) < 0; });
          state.profile.appearance.accessories = next.concat([value]);
        } else {
          // 不冲突且满格则拒绝
          if (list.length >= MAX_ACCESSORIES) {
            setToast("最多佩戴 " + MAX_ACCESSORIES + " 个配饰。", "info");
            return;
          }
          state.profile.appearance.accessories = list.concat([value]);
        }
      }
      state.profile.appearance.accessory = state.profile.appearance.accessories[0] || "无";
    } else if (key === "weapon") {
      if (!state.profile.appearance) state.profile.appearance = defaultAppearance();
      const left = state.profile.appearance.weaponLeft || "无";
      const right = state.profile.appearance.weaponRight || "无";
      if (value === "无") {
        state.profile.appearance.weaponLeft = "无";
        state.profile.appearance.weaponRight = "无";
      } else {
        const hand = weaponHandForValue(value);
        if (hand === "left") {
          state.profile.appearance.weaponLeft = left === value ? "无" : value;
        } else {
          state.profile.appearance.weaponRight = right === value ? "无" : value;
        }
      }
      state.profile.appearance.weapon = state.profile.appearance.weaponRight || "无";
    } else {
      state.profile.appearance[key] = value;
    }
    saveState();
    renderApp();
  }

  function openPomodoro(taskId) {
    const task = state.tasks.find(function (entry) { return entry.id === taskId; });
    if (!task) return;
    setModal({ type: "pomodoro", taskId: task.id, title: task.title, durationMinutes: 25, remainingSeconds: 1500, running: false, endAt: null });
  }

  function startPomodoro() {
    if (!state.modal || state.modal.type !== "pomodoro" || state.modal.running) return;
    state.modal.running = true;
    state.modal.endAt = Date.now() + state.modal.remainingSeconds * 1000;
    saveState();
    renderApp();
  }

  function pausePomodoro() {
    if (!state.modal || state.modal.type !== "pomodoro" || !state.modal.running) return;
    state.modal.remainingSeconds = Math.max(0, Math.ceil((state.modal.endAt - Date.now()) / 1000));
    state.modal.running = false;
    state.modal.endAt = null;
    saveState();
    renderApp();
  }

  function resetPomodoro() {
    if (!state.modal || state.modal.type !== "pomodoro") return;
    state.modal.remainingSeconds = state.modal.durationMinutes * 60;
    state.modal.running = false;
    state.modal.endAt = null;
    saveState();
    renderApp();
  }

  function finishPomodoro() {
    if (!state.modal || state.modal.type !== "pomodoro") return;
    const taskId = state.modal.taskId;
    setModal(null);
    completeTask(taskId, true);
  }

  function updatePomodoro() {
    if (!state.modal || state.modal.type !== "pomodoro" || !state.modal.running) return false;
    const nextRemaining = Math.max(0, Math.ceil((state.modal.endAt - Date.now()) / 1000));
    if (nextRemaining === state.modal.remainingSeconds) return false;
    state.modal.remainingSeconds = nextRemaining;
    if (nextRemaining === 0) {
      state.modal.running = false;
      state.modal.endAt = null;
      setToast("番茄钟结束了，可以结算任务。", "success");
    }
    saveState();
    return true;
  }

  function updateTimers() {
    let changed = false;
    if (maybeResetDailyState(state)) changed = true;
    if (state.toast && Date.now() > state.toast.expiresAt) {
      if (state.nextToast) {
        const next = state.nextToast;
        state.nextToast = null;
        state.toast = { text: next.text, variant: next.variant || "info", expiresAt: Date.now() + 1000 };
      } else {
        state.toast = null;
      }
      changed = true;
    }
    if (updatePomodoro()) changed = true;
    if (updatePetTimers()) changed = true;
    const trip = currentAdventureTrip();
    if (trip) {
      const remaining = Math.max(0, Math.ceil((trip.endsAt - Date.now()) / 1000));
      if (trip._lastRemaining !== remaining) {
        trip._lastRemaining = remaining;
        changed = true;
      }
    }
    // Boss 限时倒计时
    const bossTemplateNow = currentBossTemplate();
    if (bossTemplateNow && bossTemplateNow.timeLimitHours && state.bossDeadlineAt) {
      const remainingBoss = Math.max(0, Math.floor((state.bossDeadlineAt - Date.now()) / 1000));
      if (state._bossLastRemaining !== remainingBoss) {
        state._bossLastRemaining = remainingBoss;
        changed = true;
      }
    } else if (state._bossLastRemaining != null) {
      state._bossLastRemaining = null;
      changed = true;
    }
    if (changed) saveState();
    return changed;
  }

  function formatClock(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }

  function formatClockHms(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function computeView() {
    const width = Math.max(360, window.innerWidth);
    const height = Math.max(640, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    let targetLogicalWidth = 1520;
    if (width <= 420) targetLogicalWidth = 620;
    else if (width <= 560) targetLogicalWidth = 640;
    else if (width <= 900) targetLogicalWidth = 900;
    else if (width <= 1280) targetLogicalWidth = 1160;
    const scale = clamp(width / targetLogicalWidth, 0.52, 1.05);
    const logicalWidth = width / scale;
    const logicalHeight = height / scale;
    const sidePadding = logicalWidth <= 760 ? 24 : 40;
    const contentWidth = Math.min(1520, logicalWidth - sidePadding);
    return {
      width: width,
      height: height,
      dpr: dpr,
      scale: scale,
      logicalWidth: logicalWidth,
      logicalHeight: logicalHeight,
      contentWidth: contentWidth,
      left: (logicalWidth - contentWidth) / 2
    };
  }

  function resizeMainCanvas(view, designHeight) {
    mainCanvas.width = Math.floor(view.width * view.dpr);
    mainCanvas.height = Math.floor(designHeight * view.scale * view.dpr);
    mainCanvas.style.width = view.width + "px";
    mainCanvas.style.height = designHeight * view.scale + "px";
    ctx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function resizeOverlayCanvas(view) {
    overlayCanvas.width = Math.floor(view.width * view.dpr);
    overlayCanvas.height = Math.floor(view.height * view.dpr);
    overlayCanvas.style.width = view.width + "px";
    overlayCanvas.style.height = view.height + "px";
    overlayCtx.setTransform(view.dpr * view.scale, 0, 0, view.dpr * view.scale, 0, 0);
    overlayCtx.imageSmoothingEnabled = false;
  }

  function registerRegion(target, x, y, width, height, onClick, options) {
    const opts = options || {};
    target.push({
      x: x, y: y, width: width, height: height,
      onClick: onClick,
      cursor: opts.cursor || "pointer",
      keepInput: Boolean(opts.keepInput),
      tooltip: opts.tooltip || null,
      regionKey: opts.regionKey || null,
      onDblClick: opts.onDblClick || null
    });
  }

  function registerClippedRegion(target, x, y, width, height, clipX, clipY, clipW, clipH, onClick, options) {
    const visibleX = Math.max(x, clipX);
    const visibleY = Math.max(y, clipY);
    const visibleRight = Math.min(x + width, clipX + clipW);
    const visibleBottom = Math.min(y + height, clipY + clipH);
    const visibleW = visibleRight - visibleX;
    const visibleH = visibleBottom - visibleY;
    if (visibleW <= 0 || visibleH <= 0) return;
    registerRegion(target, visibleX, visibleY, visibleW, visibleH, onClick, options);
  }

  function hitTest(target, x, y) {
    for (let i = target.length - 1; i >= 0; i -= 1) {
      const region = target[i];
      if (x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height) return region;
    }
    return null;
  }

  function getFieldValue(fieldKey) {
    if (fieldKey === "profileName") return state.profile.name || HERO_ROLE;
    if (fieldKey === "taskTitle") return state.composer.taskTitle;
    if (fieldKey === "rewardName") return state.composer.rewardName;
    if (fieldKey === "renameInput" && state.modal && state.modal.type === "rename") return state.modal.inputValue !== undefined ? state.modal.inputValue : state.modal.currentName || "";
    if (fieldKey === "rewardPrice") return state.composer.rewardPrice;
    if (fieldKey === "pomodoroMinutes" && state.modal && state.modal.type === "pomodoro") return String(state.modal.durationMinutes);
    if (fieldKey === "createChallengeTitle" && state.modal && state.modal.type === "createChallenge") return state.modal.title || "";
    if (fieldKey === "createChallengeDeadlineHour" && state.modal && state.modal.type === "createChallenge") {
      ensureCreateChallengeModalDefaults(state.modal);
      return state.modal.deadlineHourText || "";
    }
    if (fieldKey === "createChallengeDeadlineMinute" && state.modal && state.modal.type === "createChallenge") {
      ensureCreateChallengeModalDefaults(state.modal);
      return state.modal.deadlineMinuteText || "";
    }
    if (fieldKey === "createRewardName" && state.modal && state.modal.type === "createReward") return state.modal.name || "";
    if (fieldKey === "createRewardPrice" && state.modal && state.modal.type === "createReward") return state.modal.priceText || "";
    return "";
  }

  function setFieldValue(fieldKey, value) {
    if (fieldKey === "profileName") state.profile.name = value.slice(0, 16);
    else if (fieldKey === "taskTitle") state.composer.taskTitle = value.slice(0, 20);
    else if (fieldKey === "rewardName") state.composer.rewardName = value.slice(0, 20);
    else if (fieldKey === "renameInput" && state.modal && state.modal.type === "rename") state.modal.inputValue = value.slice(0, 20);
    else if (fieldKey === "rewardPrice") state.composer.rewardPrice = value.slice(0, 4);
    else if (fieldKey === "pomodoroMinutes" && state.modal && state.modal.type === "pomodoro") {
      const numeric = clamp(Number(value || "1"), 1, 90);
      state.modal.durationMinutes = numeric;
      if (!state.modal.running) state.modal.remainingSeconds = numeric * 60;
    }
    else if (fieldKey === "createChallengeTitle" && state.modal && state.modal.type === "createChallenge") state.modal.title = value.slice(0, 20);
    else if (fieldKey === "createChallengeDeadlineHour" && state.modal && state.modal.type === "createChallenge") {
      ensureCreateChallengeModalDefaults(state.modal);
      state.modal.deadlineHourText = value.slice(0, 2);
    }
    else if (fieldKey === "createChallengeDeadlineMinute" && state.modal && state.modal.type === "createChallenge") {
      ensureCreateChallengeModalDefaults(state.modal);
      state.modal.deadlineMinuteText = value.slice(0, 2);
    }
    else if (fieldKey === "createRewardName" && state.modal && state.modal.type === "createReward") state.modal.name = value.slice(0, 20);
    else if (fieldKey === "createRewardPrice" && state.modal && state.modal.type === "createReward") state.modal.priceText = value.slice(0, 4);
  }

  function syncCanvasInput() {
    if (!activeInput || !currentView) {
      hiddenInput.style.left = "-9999px";
      hiddenInput.style.top = "-9999px";
      hiddenInput.style.width = "1px";
      hiddenInput.style.height = "1px";
      hiddenInput.style.opacity = "0";
      hiddenInput.placeholder = "";
      return;
    }
    const bounds = inputFieldMap[activeInput.fieldKey];
    if (!bounds) {
      hiddenInput.style.left = "-9999px";
      hiddenInput.style.top = "-9999px";
      hiddenInput.style.width = "1px";
      hiddenInput.style.height = "1px";
      hiddenInput.style.opacity = "0";
      hiddenInput.placeholder = "";
      return;
    }
    const hostCanvas = bounds.overlay ? overlayCanvas : mainCanvas;
    const rect = hostCanvas.getBoundingClientRect();
    hiddenInput.style.left = rect.left + bounds.x * currentView.scale + 14 * currentView.scale + "px";
    hiddenInput.style.top = rect.top + bounds.y * currentView.scale + 10 * currentView.scale + "px";
    hiddenInput.style.width = Math.max(1, (bounds.width - 28) * currentView.scale) + "px";
    hiddenInput.style.height = Math.max(1, (bounds.height - 20) * currentView.scale) + "px";
    hiddenInput.style.fontSize = Math.max(16, 24 * currentView.scale) + "px";
    hiddenInput.style.opacity = "1";
    hiddenInput.placeholder = bounds.placeholder || "";
  }

  function activateInput(fieldKey, numeric) {
    activeInput = { fieldKey: fieldKey, numeric: Boolean(numeric) };
    hiddenInput.value = getFieldValue(fieldKey);
    hiddenInput.inputMode = numeric ? "numeric" : "text";
    hiddenInput.type = "text";
    isComposingInput = false;
    syncCanvasInput();
    setTimeout(function () {
      hiddenInput.focus();
      try {
        const caret = hiddenInput.value.length;
        hiddenInput.setSelectionRange(caret, caret);
      } catch (error) {
        // selection APIs may fail for some input modes
      }
    }, 0);
    renderApp();
  }

  function blurActiveInput() {
    activeInput = null;
    isComposingInput = false;
    hiddenInput.blur();
    hiddenInput.value = "";
    syncCanvasInput();
  }

  hiddenInput.addEventListener("input", function () {
    if (!activeInput) return;
    let value = hiddenInput.value;
    if (activeInput.numeric) {
      value = value.replace(/[^\d]/g, "");
      if (value !== hiddenInput.value) hiddenInput.value = value;
    }
    setFieldValue(activeInput.fieldKey, value);
    saveState();
    if (!isComposingInput) renderApp();
  });

  hiddenInput.addEventListener("compositionstart", function () {
    isComposingInput = true;
  });

  hiddenInput.addEventListener("compositionend", function () {
    isComposingInput = false;
    if (!activeInput) return;
    let value = hiddenInput.value;
    if (activeInput.numeric) {
      value = value.replace(/[^\d]/g, "");
      hiddenInput.value = value;
    }
    setFieldValue(activeInput.fieldKey, value);
    saveState();
    renderApp();
  });

  hiddenInput.addEventListener("blur", function () {
    if (!activeInput) return;
    activeInput = null;
    isComposingInput = false;
    hiddenInput.value = "";
    renderApp();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      if (state.modal && state.modal.type === "exportReminder") {
        state.lastExportReminderDay = dayKey();
      }
      if (state.modal) setModal(null);
      else {
        blurActiveInput();
        renderApp();
      }
    }
    if (event.key === "Enter" && activeInput) {
      blurActiveInput();
      renderApp();
    }
  });

  function fillRect(targetCtx, x, y, width, height, color) {
    targetCtx.fillStyle = color;
    targetCtx.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
  }

  function drawPanel(targetCtx, x, y, width, height, fill) {
    fillRect(targetCtx, x, y, width, height, THEME.frameLight);
    fillRect(targetCtx, x + 8, y + 8, width - 16, height - 16, THEME.frame);
    fillRect(targetCtx, x + 16, y + 16, width - 32, height - 32, fill || THEME.paper);
    targetCtx.strokeStyle = THEME.frameDark;
    targetCtx.lineWidth = 4;
    targetCtx.strokeRect(x + 16, y + 16, width - 32, height - 32);
  }

  function drawSectionShell(targetCtx, x, y, width, height, options) {
    const opts = options || {};
    const fill = opts.fill || THEME.paper;
    const inset = Math.max(3, Math.min(6, Number(opts.inset) || 4));
    const barH = Math.max(50, Math.min(64, Number(opts.barHeight) || 56));
    // Smaller container: no "largest outer border", just a clean card-like shell.
    fillRect(targetCtx, x, y, width, height, fill);
    targetCtx.strokeStyle = THEME.frame;
    targetCtx.lineWidth = 3;
    targetCtx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    targetCtx.strokeStyle = THEME.frameLight;
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(x + inset + 0.5, y + inset + 0.5, width - inset * 2 - 1, height - inset * 2 - 1);

    // Header bar: light + theme-following (use frameLight/paper tones).
    const barX = x + inset;
    const barY = y + inset;
    const barW = width - inset * 2;
    fillRect(targetCtx, barX, barY, barW, barH, THEME.frameLight);
    fillRect(targetCtx, barX + 4, barY + 4, barW - 8, barH - 8, THEME.paperMuted);
    // Divider line between header and content
    targetCtx.strokeStyle = THEME.frame;
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(barX + 0.5, barY + barH - 1.5, barW - 1, 2);
    return { barH: barH };
  }

  function drawCard(targetCtx, x, y, width, height, fill) {
    fillRect(targetCtx, x, y, width, height, THEME.frame);
    fillRect(targetCtx, x + 6, y + 6, width - 12, height - 12, fill || THEME.paper);
    targetCtx.strokeStyle = THEME.frameLight;
    targetCtx.lineWidth = 3;
    targetCtx.strokeRect(x + 6, y + 6, width - 12, height - 12);
  }

  function resolveButtonLabelSprites(label, width, height, options, textColor) {
    const lines = Array.isArray(label) ? label.map(function (entry) { return String(entry); }) : String(label).split("\n");
    const baseSize = (options && typeof options.fontSize === "number") ? options.fontSize : (options && options.small ? 14 : 18);
    const minSize = (options && typeof options.minFontSize === "number") ? options.minFontSize : 9;
    const gap = lines.length > 1 ? 4 : 0;
    let size = Math.max(minSize, Math.round(baseSize));
    let sprites = [];
    while (size > minSize) {
      sprites = lines.map(function (line) {
        return getTextSprite(line, { size: size, color: textColor, font: "sans-serif" });
      });
      const widest = sprites.reduce(function (maxWidth, sprite) { return Math.max(maxWidth, sprite.width); }, 0);
      const totalHeight = sprites.reduce(function (sum, sprite) { return sum + sprite.height; }, 0) + gap * Math.max(0, sprites.length - 1);
      if (widest <= width - 18 && totalHeight <= height - 12) return sprites;
      size -= 1;
    }
    return lines.map(function (line) {
      return getTextSprite(line, { size: minSize, color: textColor, font: "sans-serif" });
    });
  }

  function drawButton(targetCtx, x, y, width, height, label, variant, options) {
    const config = BUTTON_VARIANTS[options && options.disabled ? "disabled" : variant] || BUTTON_VARIANTS.yellow;
    const shadowOffset = 7;
    fillRect(targetCtx, x + shadowOffset, y + shadowOffset, width, height, config.shadow);
    fillRect(targetCtx, x, y, width, height, config.fill);
    targetCtx.strokeStyle = THEME.black;
    targetCtx.lineWidth = 4;
    targetCtx.strokeRect(x, y, width, height);
    if (options && options.active) {
      targetCtx.strokeStyle = "#fff7d3";
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(x + 6, y + 6, width - 12, height - 12);
    }
    const sprites = resolveButtonLabelSprites(label, width, height, options, config.text);
    const gap = sprites.length > 1 ? 4 : 0;
    const totalHeight = sprites.reduce(function (sum, sprite) { return sum + sprite.height; }, 0) + gap * Math.max(0, sprites.length - 1);
    let cursorY = y + (height - totalHeight) / 2;
    sprites.forEach(function (sprite) {
      targetCtx.drawImage(sprite, Math.round(x + (width - sprite.width) / 2), Math.round(cursorY));
      cursorY += sprite.height + gap;
    });
  }

  function drawTodoCheckbox(targetCtx, x, y, checked) {
    fillRect(targetCtx, x, y, 34, 34, THEME.black);
    fillRect(targetCtx, x + 4, y + 4, 26, 26, checked ? "#dff3ce" : THEME.paperMuted);
    if (!checked) return;
    fillRect(targetCtx, x + 8, y + 18, 4, 4, THEME.greenShadow);
    fillRect(targetCtx, x + 12, y + 22, 4, 4, THEME.greenShadow);
    fillRect(targetCtx, x + 16, y + 18, 4, 4, THEME.greenShadow);
    fillRect(targetCtx, x + 20, y + 14, 4, 4, THEME.greenShadow);
    fillRect(targetCtx, x + 11, y + 17, 4, 4, THEME.green);
    fillRect(targetCtx, x + 15, y + 21, 4, 4, THEME.green);
    fillRect(targetCtx, x + 19, y + 17, 4, 4, THEME.green);
    fillRect(targetCtx, x + 23, y + 13, 4, 4, THEME.green);
  }

  function drawGearIcon(targetCtx, x, y, size, color) {
    const unit = size / 16;
    [
      [6, 0, 4, 2], [6, 14, 4, 2], [0, 6, 2, 4], [14, 6, 2, 4],
      [2, 2, 2, 2], [12, 2, 2, 2], [2, 12, 2, 2], [12, 12, 2, 2],
      [4, 4, 8, 8], [6, 6, 4, 4]
    ].forEach(function (rect) {
      fillRect(targetCtx, x + rect[0] * unit, y + rect[1] * unit, rect[2] * unit, rect[3] * unit, color);
    });
    fillRect(targetCtx, x + 7 * unit, y + 7 * unit, 2 * unit, 2 * unit, THEME.paper);
  }

  function drawGearButton(targetCtx, x, y, size) {
    drawButton(targetCtx, x, y, size, size, "", "paper", { small: true });
    drawGearIcon(targetCtx, x + 16, y + 16, size - 32, THEME.ink);
  }

  function hasCjkGlyph(text) {
    return /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(String(text));
  }

  function normalizeFontWeight(weight, text) {
    const nextWeight = String(weight || "600");
    if (!hasCjkGlyph(text)) return nextWeight;
    const numericWeight = Number(nextWeight);
    if (nextWeight === "bold" || numericWeight >= 700) return "700";
    if (numericWeight >= 600) return "600";
    if (numericWeight >= 500) return "500";
    return "400";
  }

  function resolveFontFamily(font, text) {
    if (font === "pixel") return PIXEL_FONT_STACK;
    if (font && font !== "sans-serif") return font;
    return CJK_PIXEL_FONT_STACK;
  }

  function normalizeBitmapGlyphChar(char) {
    if (char === "：") return ":";
    return char;
  }

  function isBitmapGlyphChar(char) {
    return Object.prototype.hasOwnProperty.call(BITMAP_DIGIT_GLYPHS, normalizeBitmapGlyphChar(char));
  }

  function bitmapScaleForSize(size) {
    return Math.max(1, Math.round(size / 8));
  }

  function bitmapGlyphWidth(char) {
    const glyph = BITMAP_DIGIT_GLYPHS[normalizeBitmapGlyphChar(char)];
    if (!glyph || !glyph.length) return 4;
    return glyph[0].length + 1;
  }

  function drawBitmapGlyph(targetCtx, char, x, y, scale, color) {
    const glyph = BITMAP_DIGIT_GLYPHS[normalizeBitmapGlyphChar(char)];
    if (!glyph) return;
    glyph.forEach(function (row, rowIndex) {
      String(row).split("").forEach(function (cell, colIndex) {
        if (cell !== "1") return;
        fillRect(targetCtx, x + colIndex * scale, y + rowIndex * scale, scale, scale, color);
      });
    });
  }

  function useTextStyle(targetCtx, text, size, color, weight, font) {
    const textValue = String(text);
    const resolvedWeight = normalizeFontWeight(weight || "600", textValue);
    targetCtx.font = resolvedWeight + " " + Math.max(8, Math.round(size)) + "px " + resolveFontFamily(font || null, textValue);
    targetCtx.fillStyle = color || THEME.ink;
    targetCtx.textBaseline = "top";
    targetCtx.imageSmoothingEnabled = false;
  }

  function measureStyledTextWidth(targetCtx, text, size, weight, font) {
    const textValue = String(text);
    useTextStyle(targetCtx, textValue, size, THEME.ink, weight, font);
    const scale = bitmapScaleForSize(size);
    let width = 0;
    textValue.split("").forEach(function (char) {
      if (isBitmapGlyphChar(char)) width += bitmapGlyphWidth(char) * scale;
      else width += targetCtx.measureText(char).width;
    });
    return Math.ceil(width);
  }

  function drawStyledText(targetCtx, text, x, y, size, color, weight, align, font) {
    const textValue = String(text);
    const totalWidth = measureStyledTextWidth(targetCtx, textValue, size, weight, font);
    useTextStyle(targetCtx, textValue, size, color, weight, font);
    let drawX = x;
    if (align === "center") drawX -= totalWidth / 2;
    else if (align === "right") drawX -= totalWidth;
    const scale = bitmapScaleForSize(size);
    const glyphHeight = 7 * scale;
    const glyphY = Math.round(y + Math.max(0, (Math.round(size * 1.1) - glyphHeight) / 2));
    let cursorX = drawX;
    textValue.split("").forEach(function (char) {
      if (isBitmapGlyphChar(char)) {
        drawBitmapGlyph(targetCtx, char, Math.round(cursorX), glyphY, scale, color || THEME.ink);
        cursorX += bitmapGlyphWidth(char) * scale;
      } else {
        targetCtx.fillText(char, cursorX, y);
        cursorX += targetCtx.measureText(char).width;
      }
    });
    return totalWidth;
  }

  function getTextSprite(text, options) {
    const textValue = String(text);
    const size = options && options.size ? options.size : 20;
    const color = options && options.color ? options.color : THEME.ink;
    const font = options && options.font ? options.font : null;
    const weight = options && options.weight ? options.weight : "700";
    const renderSize = Math.max(8, Math.round(size));
    const resolvedFont = resolveFontFamily(font, textValue);
    const resolvedWeight = normalizeFontWeight(weight, textValue);
    const key = [textValue, renderSize, color, resolvedFont, resolvedWeight, "hybrid-font"].join("|");
    if (textCache.has(key)) return textCache.get(key);

    const probe = document.createElement("canvas");
    const probeCtx = probe.getContext("2d");
    const width = measureStyledTextWidth(probeCtx, textValue, renderSize, resolvedWeight, font) + 6;
    const height = Math.max(Math.ceil(renderSize * 1.45) + 6, bitmapScaleForSize(renderSize) * 7 + 8);

    const full = document.createElement("canvas");
    full.width = width;
    full.height = height;
    const fullCtx = full.getContext("2d");
    fullCtx.imageSmoothingEnabled = false;
    drawStyledText(fullCtx, textValue, 2, 1, renderSize, color, resolvedWeight, "left", font);
    textCache.set(key, full);
    return full;
  }

  function drawPixelText(targetCtx, text, x, y, options) {
    const sprite = getTextSprite(String(text), options);
    let drawX = x;
    if (options && options.align === "center") drawX -= sprite.width / 2;
    else if (options && options.align === "right") drawX -= sprite.width;
    targetCtx.drawImage(sprite, Math.round(drawX), Math.round(y));
    return { width: sprite.width, height: sprite.height };
  }

  function drawText(targetCtx, text, x, y, size, color, weight, align) {
    drawStyledText(targetCtx, text, x, y, size, color, weight, align || "left", null);
  }

  function wrapLines(targetCtx, text, width, size, weight) {
    const chars = String(text).split("");
    const lines = [];
    let current = "";
    chars.forEach(function (char) {
      const test = current + char;
      if (measureStyledTextWidth(targetCtx, test, size, weight || "500", null) > width && current) {
        lines.push(current);
        current = char;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function fitCanvasTextSize(text, maxWidth, baseSize, weight, minSize) {
    const textValue = String(text);
    let size = Math.max(minSize || 10, Math.round(baseSize));
    while (size > (minSize || 10)) {
      if (measureStyledTextWidth(ctx, textValue, size, weight || "500", null) <= maxWidth) return size;
      size -= 1;
    }
    return size;
  }

  function fitPixelTextSize(text, maxWidth, maxHeight, baseSize, minSize, options) {
    let size = Math.max(minSize || 9, Math.round(baseSize));
    while (size > (minSize || 9)) {
      const sprite = getTextSprite(String(text), {
        size: size,
        color: options && options.color,
        font: options && options.font,
        weight: options && options.weight,
      });
      if (sprite.width <= maxWidth && sprite.height <= maxHeight) return size;
      size -= 1;
    }
    return size;
  }

  function drawTextFitted(targetCtx, text, x, y, maxWidth, baseSize, color, weight, align, minSize) {
    const nextSize = fitCanvasTextSize(text, maxWidth, baseSize, weight, minSize || 10);
    drawText(targetCtx, text, x, y, nextSize, color, weight, align);
    return nextSize;
  }

  function drawParagraph(targetCtx, text, x, y, width, size, color, lineHeight, options) {
    const paragraphOptions = options || {};
    const lines = wrapLines(targetCtx, text, width, size, paragraphOptions.weight || "500");
    const safeLines = paragraphOptions.maxLines ? lines.slice(0, paragraphOptions.maxLines) : lines;
    const step = lineHeight || size + 8;
    safeLines.forEach(function (line, index) {
      drawText(targetCtx, line, x, y + index * step, size, color || THEME.inkSoft, paragraphOptions.weight || "500");
    });
    return safeLines.length * step;
  }

  function drawJustifiedParagraph(targetCtx, text, x, y, width, size, color, lineHeight, options) {
    const paragraphOptions = options || {};
    const weight = paragraphOptions.weight || "500";
    const lines = wrapLines(targetCtx, text, width, size, weight);
    const safeLines = paragraphOptions.maxLines ? lines.slice(0, paragraphOptions.maxLines) : lines;
    const step = lineHeight || size + 8;
    safeLines.forEach(function (line, index) {
      const isLastLine = index === safeLines.length - 1;
      const chars = String(line || "").split("");
      if (chars.length <= 1) {
        drawText(targetCtx, line, x, y + index * step, size, color || THEME.inkSoft, weight);
        return;
      }
      const lineWidth = measureStyledTextWidth(targetCtx, line, size, weight, null);
      const shouldJustify = !isLastLine || lineWidth >= width * 0.82 || paragraphOptions.justifyLastLine;
      if (!shouldJustify || lineWidth >= width) {
        drawText(targetCtx, line, x, y + index * step, size, color || THEME.inkSoft, weight);
        return;
      }
      const gapCount = chars.length - 1;
      const extraSpacing = (width - lineWidth) / gapCount;
      let cursorX = x;
      chars.forEach(function (char, charIndex) {
        drawText(targetCtx, char, cursorX, y + index * step, size, color || THEME.inkSoft, weight);
        if (charIndex < chars.length - 1) {
          cursorX += measureStyledTextWidth(targetCtx, char, size, weight, null) + extraSpacing;
        }
      });
    });
    return safeLines.length * step;
  }

  function drawMeter(targetCtx, x, y, width, value, max, colors, label, options) {
    const meterOptions = options || {};
    const hasLabel = label !== undefined && label !== null && String(label).trim() !== "";
    const valueText = value + " / " + max;
    let textSize = Math.max(10, Number(meterOptions.textSize) || 16);
    const minTextSize = Math.max(10, Number(meterOptions.minTextSize) || 10);
    const textOffsetY = Number.isFinite(Number(meterOptions.textOffsetY)) ? Number(meterOptions.textOffsetY) : 28;
    let labelSprite = { width: 0 };
    let valueSprite = null;
    while (textSize > minTextSize) {
      labelSprite = hasLabel ? getTextSprite(String(label), { size: textSize, color: THEME.inkSoft, font: "sans-serif" }) : { width: 0 };
      valueSprite = getTextSprite(String(valueText), { size: textSize, color: THEME.inkSoft, font: "sans-serif" });
      if (labelSprite.width + valueSprite.width + (hasLabel ? 18 : 0) <= width) break;
      textSize -= 1;
    }
    if (hasLabel) drawPixelText(targetCtx, label, x, y - textOffsetY, { size: textSize, color: THEME.inkSoft, font: "sans-serif" });
    drawPixelText(targetCtx, valueText, x + width, y - textOffsetY, { size: textSize, color: THEME.inkSoft, font: "sans-serif", align: "right" });
    fillRect(targetCtx, x, y, width, 28, THEME.black);
    fillRect(targetCtx, x + 4, y + 4, width - 8, 20, THEME.barBg);
    const safeMax = max > 0 ? max : 1;
    const ratio = clamp(value / safeMax, 0, 1);
    const fullWidth = width - 8;
    if (ratio <= 0) return;
    if (ratio >= 1) {
      fillRect(targetCtx, x + 4, y + 4, fullWidth, 20, colors[0]);
      return;
    }
    const fillWidth = Math.max(1, Math.round(fullWidth * ratio));
    const mid = Math.max(1, Math.floor(fillWidth * 0.65));
    fillRect(targetCtx, x + 4, y + 4, mid, 20, colors[0]);
    fillRect(targetCtx, x + 4 + mid, y + 4, fillWidth - mid, 20, colors[1]);
  }

  function drawStatBox(targetCtx, x, y, width, height, label, value) {
    const phoneReadable = typeof window !== "undefined" && Math.max(window.innerWidth || 0, 0) <= 560;
    const tallCard = height >= 96;
    const labelSize = phoneReadable ? (tallCard ? 14 : 12) : 11;
    const labelY = y + (phoneReadable ? (tallCard ? 12 : 10) : 14);
    const valueBaseSize = phoneReadable ? (tallCard ? 40 : 32) : 28;
    const valueMinSize = phoneReadable ? (tallCard ? 20 : 18) : 16;
    drawCard(targetCtx, x, y, width, height, THEME.paper);
    drawPixelText(targetCtx, label, x + 16, labelY, { size: labelSize, color: THEME.inkSoft, font: "sans-serif" });
    const valueText = String(value);
    const fittedSize = fitCanvasTextSize(valueText, width - 34, valueBaseSize, "700", valueMinSize);
    const valueY = phoneReadable
      ? (y + (tallCard ? 44 : 26))
      : (y + Math.max(34, Math.round(height * 0.48) - Math.round(fittedSize * 0.18)));
    drawText(targetCtx, valueText, x + 18, valueY, fittedSize, THEME.ink, "700");
  }

  function drawSectionHeader(targetCtx, x, y, small, title, options) {
    const headerOptions = options || {};
    const smallWidth = headerOptions.smallWidth || 360;
    const titleWidth = headerOptions.titleWidth || 700;
    const smallSize = headerOptions.smallSize || 14;
    const smallMinSize = headerOptions.smallMinSize || 11;
    const titleSize = headerOptions.titleSize || 30;
    const titleMinSize = headerOptions.titleMinSize || 18;
    const titleOffsetY = headerOptions.titleOffsetY || 22;
    drawTextFitted(targetCtx, small, x, y, smallWidth, smallSize, THEME.inkSoft, "500", "left", smallMinSize);
    drawTextFitted(targetCtx, title, x, y + titleOffsetY, titleWidth, titleSize, THEME.ink, "700", "left", titleMinSize);
  }

  function measureTextWidth(text, size) {
    return measureStyledTextWidth(ctx, text, size, "500", null);
  }

  function spriteCanvas(key, size, painter) {
    const cacheKey = key + "|" + size;
    if (spriteCache.has(cacheKey)) return spriteCache.get(cacheKey);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const sctx = canvas.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    painter(sctx, size);
    spriteCache.set(cacheKey, canvas);
    return canvas;
  }

  function drawScenePixels(sctx, sceneName, size) {
    const theme = SCENE_THEMES[sceneName] || SCENE_THEMES["草地小径"];
    const unit = size / 32;
    fillRect(sctx, 0, 0, size, size * 0.62, theme.sky);
    fillRect(sctx, 0, size * 0.62, size, size * 0.18, theme.groundA);
    fillRect(sctx, 0, size * 0.8, size, size * 0.2, theme.groundB);
    if (theme.kind === "moon") {
      fillRect(sctx, 22 * unit, 3 * unit, 3 * unit, 3 * unit, theme.accent);
      fillRect(sctx, 4 * unit, 5 * unit, 9 * unit, 2 * unit, theme.cloud);
      fillRect(sctx, 20 * unit, 7 * unit, 8 * unit, 2 * unit, theme.cloud);
    } else if (theme.kind === "meadow") {
      fillRect(sctx, 4 * unit, 5 * unit, 7 * unit, 2 * unit, theme.cloud);
      fillRect(sctx, 22 * unit, 6 * unit, 6 * unit, 2 * unit, theme.cloud);
    } else if (theme.kind === "hill") {
      fillRect(sctx, 18 * unit, 11 * unit, 5 * unit, 9 * unit, theme.accent);
      fillRect(sctx, 17 * unit, 10 * unit, 8 * unit, 4 * unit, "#7db962");
    } else if (theme.kind === "gate") {
      fillRect(sctx, 4 * unit, 5 * unit, 6 * unit, 2 * unit, theme.cloud);
      fillRect(sctx, 22 * unit, 6 * unit, 5 * unit, 2 * unit, theme.cloud);
      fillRect(sctx, 9 * unit, 12 * unit, 5 * unit, 8 * unit, theme.accent);
      fillRect(sctx, 14 * unit, 9 * unit, 5 * unit, 11 * unit, theme.accent);
      fillRect(sctx, 19 * unit, 12 * unit, 5 * unit, 8 * unit, theme.accent);
      fillRect(sctx, 15 * unit, 7 * unit, 3 * unit, 2 * unit, theme.accent);
      fillRect(sctx, 16 * unit, 6 * unit, 1 * unit, 1 * unit, theme.accent);
      fillRect(sctx, 10 * unit, 13 * unit, 3 * unit, 5 * unit, "#f6edd4");
      fillRect(sctx, 15 * unit, 10 * unit, 3 * unit, 8 * unit, "#f6edd4");
      fillRect(sctx, 20 * unit, 13 * unit, 3 * unit, 5 * unit, "#f6edd4");
      fillRect(sctx, 15 * unit, 15 * unit, 3 * unit, 5 * unit, "#caa785");
      fillRect(sctx, 10 * unit, 11 * unit, 3 * unit, 1 * unit, "#d6cfbe");
      fillRect(sctx, 15 * unit, 8 * unit, 3 * unit, 1 * unit, "#d6cfbe");
      fillRect(sctx, 20 * unit, 11 * unit, 3 * unit, 1 * unit, "#d6cfbe");
    } else if (theme.kind === "post") {
      fillRect(sctx, 5 * unit, 5 * unit, 8 * unit, 2 * unit, theme.cloud);
      fillRect(sctx, 21 * unit, 6 * unit, 6 * unit, 2 * unit, theme.cloud);
      fillRect(sctx, 3 * unit, 17 * unit, 2 * unit, 7 * unit, "#7ea45b");
      fillRect(sctx, 4 * unit, 15 * unit, 2 * unit, 9 * unit, "#92bb72");
      fillRect(sctx, 6 * unit, 18 * unit, 1 * unit, 5 * unit, "#6f944f");
      fillRect(sctx, 8 * unit, 14 * unit, 2 * unit, 10 * unit, "#88b36a");
      fillRect(sctx, 10 * unit, 16 * unit, 2 * unit, 8 * unit, "#79a95b");
      fillRect(sctx, 12 * unit, 13 * unit, 2 * unit, 11 * unit, theme.accent);
      fillRect(sctx, 14 * unit, 17 * unit, 1 * unit, 6 * unit, "#96c276");
      fillRect(sctx, 16 * unit, 15 * unit, 2 * unit, 9 * unit, "#83b064");
      fillRect(sctx, 18 * unit, 18 * unit, 1 * unit, 5 * unit, "#6f944f");
      fillRect(sctx, 20 * unit, 14 * unit, 2 * unit, 10 * unit, "#8fbb70");
      fillRect(sctx, 22 * unit, 16 * unit, 2 * unit, 8 * unit, "#7aa65c");
      fillRect(sctx, 24 * unit, 13 * unit, 2 * unit, 11 * unit, "#7ea45b");
      fillRect(sctx, 26 * unit, 18 * unit, 1 * unit, 5 * unit, "#6a8d4a");
      fillRect(sctx, 9 * unit, 19 * unit, 3 * unit, 2 * unit, "#a8d390");
      fillRect(sctx, 19 * unit, 20 * unit, 4 * unit, 2 * unit, "#9fca83");
    } else if (theme.kind === "street") {
      fillRect(sctx, 23 * unit, 4 * unit, 4 * unit, 4 * unit, "#f6d48a");
      fillRect(sctx, 24 * unit, 5 * unit, 2 * unit, 2 * unit, "#ffe9ad");
      fillRect(sctx, 0, 20 * unit, size, 4 * unit, "#d8bea9");
      fillRect(sctx, 0, 24 * unit, size, 8 * unit, "#b69076");
      fillRect(sctx, 7 * unit, 17 * unit, 13 * unit, 2 * unit, theme.accent);
      fillRect(sctx, 8 * unit, 15 * unit, 11 * unit, 2 * unit, "#b48767");
      fillRect(sctx, 9 * unit, 14 * unit, 9 * unit, 1 * unit, "#c99a79");
      fillRect(sctx, 9 * unit, 19 * unit, 1 * unit, 5 * unit, "#8f6447");
      fillRect(sctx, 17 * unit, 19 * unit, 1 * unit, 5 * unit, "#8f6447");
      fillRect(sctx, 6 * unit, 18 * unit, 2 * unit, 1 * unit, "#d8bea9");
      fillRect(sctx, 19 * unit, 18 * unit, 2 * unit, 1 * unit, "#d8bea9");
    } else if (theme.kind === "library") {
      fillRect(sctx, 7 * unit, 10 * unit, 7 * unit, 9 * unit, theme.accent);
      fillRect(sctx, 15 * unit, 9 * unit, 5 * unit, 10 * unit, "#946b45");
      fillRect(sctx, 21 * unit, 8 * unit, 4 * unit, 11 * unit, "#7d5c3a");
      fillRect(sctx, 8 * unit, 12 * unit, 2 * unit, 2 * unit, "#e5c55c");
      fillRect(sctx, 10 * unit, 12 * unit, 1 * unit, 2 * unit, "#cba44b");
      fillRect(sctx, 11 * unit, 12 * unit, 2 * unit, 2 * unit, "#eecf71");
      fillRect(sctx, 8 * unit, 16 * unit, 2 * unit, 2 * unit, "#e5c55c");
      fillRect(sctx, 10 * unit, 16 * unit, 1 * unit, 2 * unit, "#cba44b");
      fillRect(sctx, 11 * unit, 16 * unit, 2 * unit, 2 * unit, "#eecf71");
      fillRect(sctx, 16 * unit, 10 * unit, 1 * unit, 8 * unit, "#c69056");
      fillRect(sctx, 17 * unit, 10 * unit, 1 * unit, 8 * unit, "#9f6c38");
      fillRect(sctx, 18 * unit, 10 * unit, 1 * unit, 8 * unit, "#b77c44");
      fillRect(sctx, 22 * unit, 9 * unit, 1 * unit, 9 * unit, "#8e6337");
      fillRect(sctx, 23 * unit, 9 * unit, 1 * unit, 9 * unit, "#6f4e2b");
      fillRect(sctx, 22 * unit, 11 * unit, 2 * unit, 1 * unit, "#a97a49");
      fillRect(sctx, 22 * unit, 14 * unit, 2 * unit, 1 * unit, "#a97a49");
    } else if (theme.kind === "beach") {
      fillRect(sctx, 0, 11 * unit, size, 6 * unit, "#7ec2e7");
      fillRect(sctx, 0, 13 * unit, size, 1 * unit, "#5fa8d2");
      fillRect(sctx, 0, 15 * unit, size, 1 * unit, "#95d4f0");
      fillRect(sctx, 0, 18 * unit, size, 6 * unit, "#e8d6ae");
      fillRect(sctx, 0, 24 * unit, size, 8 * unit, "#c4b176");
      fillRect(sctx, 5 * unit, 5 * unit, 2 * unit, 1 * unit, "#f7fdff");
      fillRect(sctx, 7 * unit, 5 * unit, 2 * unit, 1 * unit, "#f7fdff");
      fillRect(sctx, 20 * unit, 11 * unit, 3 * unit, 11 * unit, "#b36f40");
      fillRect(sctx, 19 * unit, 10 * unit, 5 * unit, 2 * unit, "#5ea960");
      fillRect(sctx, 18 * unit, 11 * unit, 7 * unit, 3 * unit, "#7bbf6d");
      fillRect(sctx, 20 * unit, 12 * unit, 3 * unit, 1 * unit, "#97d889");
      fillRect(sctx, 17 * unit, 13 * unit, 2 * unit, 1 * unit, "#5f9f5d");
      fillRect(sctx, 24 * unit, 13 * unit, 2 * unit, 1 * unit, "#5f9f5d");
    } else if (theme.kind === "ruins") {
      fillRect(sctx, 0, 19 * unit, size, 5 * unit, "#cbc4d0");
      fillRect(sctx, 0, 24 * unit, size, 8 * unit, theme.accent);
      fillRect(sctx, 7 * unit, 11 * unit, 4 * unit, 8 * unit, "#b9b0bd");
      fillRect(sctx, 11 * unit, 9 * unit, 3 * unit, 10 * unit, "#a59aa7");
      fillRect(sctx, 14 * unit, 8 * unit, 4 * unit, 11 * unit, theme.accent);
      fillRect(sctx, 18 * unit, 10 * unit, 3 * unit, 9 * unit, "#b0a6b2");
      fillRect(sctx, 21 * unit, 12 * unit, 3 * unit, 7 * unit, "#8f8592");
      fillRect(sctx, 8 * unit, 10 * unit, 2 * unit, 1 * unit, "#d9d1dc");
      fillRect(sctx, 15 * unit, 7 * unit, 2 * unit, 1 * unit, "#f0e9f4");
      fillRect(sctx, 22 * unit, 11 * unit, 1 * unit, 1 * unit, "#c7becb");
      fillRect(sctx, 10 * unit, 16 * unit, 2 * unit, 3 * unit, "#8d8290");
      fillRect(sctx, 15 * unit, 15 * unit, 2 * unit, 4 * unit, "#786e7b");
      fillRect(sctx, 19 * unit, 17 * unit, 2 * unit, 2 * unit, "#9a909d");
      fillRect(sctx, 5 * unit, 21 * unit, 4 * unit, 2 * unit, "#a69cab");
      fillRect(sctx, 12 * unit, 22 * unit, 3 * unit, 2 * unit, "#908592");
      fillRect(sctx, 20 * unit, 21 * unit, 5 * unit, 2 * unit, "#a69cab");
    } else if (theme.kind === "sakura") {
      fillRect(sctx, 9 * unit, 11 * unit, 2 * unit, 8 * unit, "#925d47");
      fillRect(sctx, 10 * unit, 9 * unit, 1 * unit, 3 * unit, "#7b4d39");
      fillRect(sctx, 8 * unit, 10 * unit, 1 * unit, 2 * unit, "#a66d55");
      fillRect(sctx, 6 * unit, 7 * unit, 8 * unit, 2 * unit, theme.accent);
      fillRect(sctx, 5 * unit, 8 * unit, 10 * unit, 2 * unit, "#e3b3d5");
      fillRect(sctx, 6 * unit, 10 * unit, 8 * unit, 2 * unit, theme.accent);
      fillRect(sctx, 7 * unit, 6 * unit, 2 * unit, 1 * unit, "#f0c6e4");
      fillRect(sctx, 10 * unit, 6 * unit, 2 * unit, 1 * unit, "#f0c6e4");
      fillRect(sctx, 13 * unit, 7 * unit, 1 * unit, 1 * unit, "#f7ddf0");
      fillRect(sctx, 12 * unit, 9 * unit, 2 * unit, 1 * unit, "#cf8fb9");
      fillRect(sctx, 7 * unit, 9 * unit, 2 * unit, 1 * unit, "#cf8fb9");
      fillRect(sctx, 22 * unit, 8 * unit, 2 * unit, 2 * unit, "#fff4ff");
      fillRect(sctx, 24 * unit, 12 * unit, 2 * unit, 2 * unit, "#fff4ff");
      fillRect(sctx, 20 * unit, 14 * unit, 2 * unit, 2 * unit, "#fff4ff");
      fillRect(sctx, 18 * unit, 10 * unit, 1 * unit, 1 * unit, "#f8e7f5");
      fillRect(sctx, 21 * unit, 16 * unit, 1 * unit, 1 * unit, "#f8e7f5");
    } else if (theme.kind === "snow") {
      fillRect(sctx, 0, 12 * unit, size, 8 * unit, "#c1d0df");
      fillRect(sctx, 0, 20 * unit, size, 12 * unit, "#dfe8f2");
      fillRect(sctx, 0, 24 * unit, size, 8 * unit, "#d3dde8");
      fillRect(sctx, 0, 27 * unit, size, 2 * unit, "#c6d2de");
      fillRect(sctx, 4 * unit, 21 * unit, 6 * unit, 2 * unit, "#eef5fa");
      fillRect(sctx, 17 * unit, 22 * unit, 7 * unit, 2 * unit, "#eef5fa");
      fillRect(sctx, 9 * unit, 26 * unit, 8 * unit, 2 * unit, "#edf4fb");
      fillRect(sctx, 10 * unit, 11 * unit, 3 * unit, 10 * unit, theme.accent);
      fillRect(sctx, 9 * unit, 10 * unit, 5 * unit, 3 * unit, "#f5f9fb");
      fillRect(sctx, 8 * unit, 13 * unit, 7 * unit, 1 * unit, "#e6eef6");
      fillRect(sctx, 5 * unit, 5 * unit, 1 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 4 * unit, 6 * unit, 3 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 5 * unit, 7 * unit, 1 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 13 * unit, 3 * unit, 1 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 12 * unit, 4 * unit, 3 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 13 * unit, 5 * unit, 1 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 20 * unit, 7 * unit, 1 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 19 * unit, 8 * unit, 3 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 20 * unit, 9 * unit, 1 * unit, 1 * unit, "#f7fbff");
      fillRect(sctx, 25 * unit, 5 * unit, 1 * unit, 1 * unit, "#eef6ff");
      fillRect(sctx, 25 * unit, 6 * unit, 1 * unit, 1 * unit, "#eef6ff");
      fillRect(sctx, 24 * unit, 6 * unit, 1 * unit, 1 * unit, "#eef6ff");
      fillRect(sctx, 26 * unit, 6 * unit, 1 * unit, 1 * unit, "#eef6ff");
      fillRect(sctx, 25 * unit, 7 * unit, 1 * unit, 1 * unit, "#eef6ff");
      fillRect(sctx, 7 * unit, 23 * unit, 2 * unit, 1 * unit, "#c9d7e4");
      fillRect(sctx, 18 * unit, 25 * unit, 2 * unit, 1 * unit, "#c9d7e4");
      fillRect(sctx, 22 * unit, 27 * unit, 3 * unit, 1 * unit, "#bcc8d5");
    } else if (theme.kind === "aurora") {
      fillRect(sctx, 4 * unit, 5 * unit, 8 * unit, 1 * unit, "#86ffe1");
      fillRect(sctx, 9 * unit, 6 * unit, 7 * unit, 1 * unit, "#6fd9d8");
      fillRect(sctx, 14 * unit, 5 * unit, 8 * unit, 1 * unit, "#a7b1ff");
      fillRect(sctx, 19 * unit, 6 * unit, 6 * unit, 1 * unit, "#8b8ef6");
      fillRect(sctx, 8 * unit, 7 * unit, 9 * unit, 1 * unit, theme.accent);
      fillRect(sctx, 15 * unit, 7 * unit, 7 * unit, 1 * unit, theme.cloud);
      fillRect(sctx, 11 * unit, 8 * unit, 6 * unit, 1 * unit, "#d2b8ff");
      fillRect(sctx, 18 * unit, 8 * unit, 4 * unit, 1 * unit, "#9ef8dc");
      fillRect(sctx, 6 * unit, 10 * unit, 1 * unit, 1 * unit, "#fafcf7");
      fillRect(sctx, 10 * unit, 13 * unit, 1 * unit, 1 * unit, "#fafcf7");
      fillRect(sctx, 14 * unit, 11 * unit, 1 * unit, 1 * unit, "#fafcf7");
      fillRect(sctx, 19 * unit, 13 * unit, 1 * unit, 1 * unit, "#fafcf7");
      fillRect(sctx, 23 * unit, 10 * unit, 1 * unit, 1 * unit, "#fafcf7");
    } else if (theme.kind === "underwater") {
      // 上层水体的光带与漂浮亮块
      fillRect(sctx, 0, 6 * unit, size, 2 * unit, "rgba(255,255,255,0.10)");
      fillRect(sctx, 4 * unit, 4 * unit, 10 * unit, 2 * unit, theme.cloud);
      fillRect(sctx, 18 * unit, 5 * unit, 8 * unit, 2 * unit, theme.cloud);
      // 三丛水草
      const weedLight = "#2b9d6b";
      const weedDark = "#1f6b4a";
      fillRect(sctx, 5 * unit, 19 * unit, 2 * unit, 7 * unit, weedDark);
      fillRect(sctx, 4 * unit, 21 * unit, 1 * unit, 5 * unit, weedLight);
      fillRect(sctx, 7 * unit, 20 * unit, 1 * unit, 4 * unit, weedLight);
      fillRect(sctx, 14 * unit, 19 * unit, 2 * unit, 7 * unit, weedDark);
      fillRect(sctx, 13 * unit, 21 * unit, 1 * unit, 5 * unit, weedLight);
      fillRect(sctx, 16 * unit, 20 * unit, 1 * unit, 4 * unit, weedLight);
      fillRect(sctx, 24 * unit, 19 * unit, 2 * unit, 7 * unit, weedDark);
      fillRect(sctx, 23 * unit, 21 * unit, 1 * unit, 5 * unit, weedLight);
      fillRect(sctx, 26 * unit, 20 * unit, 1 * unit, 4 * unit, weedLight);
      // 泡泡
      const bubble = "#cfeeff";
      const bubbleHi = "#ffffff";
      fillRect(sctx, 8 * unit, 10 * unit, 2 * unit, 2 * unit, bubble);
      fillRect(sctx, 8 * unit, 10 * unit, 1 * unit, 1 * unit, bubbleHi);
      fillRect(sctx, 20 * unit, 8 * unit, 2 * unit, 2 * unit, bubble);
      fillRect(sctx, 20 * unit, 8 * unit, 1 * unit, 1 * unit, bubbleHi);
      fillRect(sctx, 24 * unit, 12 * unit, 1 * unit, 1 * unit, bubble);
      fillRect(sctx, 6 * unit, 13 * unit, 1 * unit, 1 * unit, bubble);
    }
  }

  function getSceneSprite(sceneName, size) {
    return spriteCanvas("scene:" + sceneName, size || 32, function (sctx, canvasSize) {
      drawScenePixels(sctx, sceneName, canvasSize);
    });
  }

  function drawCharacterPixels(sctx, appearance, size) {
    const unit = size / 32;
    const acc = currentAccessories(appearance);
    if (!appearance || !appearance.hideBackground) {
      drawScenePixels(sctx, appearance.background, size);
    }
    const skin = colorValue("skin", appearance.skin);
    const hair = colorValue("hairColor", appearance.hairColor);
    const eyeColor = colorValue("eyeColor", appearance.eyeColor || "曜石黑");
    const topColor = colorValue("topColor", appearance.topColor);
    const bottomColor = colorValue("bottomColor", appearance.bottomColor);
    const hairStyle = appearance.hairStyle || "短发";
    const eyeStyle = appearance.eyeStyle || "圆眼";
    const mouthStyle = appearance.mouthStyle || "平口-深棕";

    function tint(hex, amount) {
      const value = String(hex || "#000000").replace("#", "");
      if (value.length !== 6) return hex;
      const red = clamp(parseInt(value.slice(0, 2), 16) + amount, 0, 255);
      const green = clamp(parseInt(value.slice(2, 4), 16) + amount, 0, 255);
      const blue = clamp(parseInt(value.slice(4, 6), 16) + amount, 0, 255);
      return "#" + [red, green, blue].map(function (part) { return part.toString(16).padStart(2, "0"); }).join("");
    }

    function lightenColor(hex, ratio) {
      return tint(hex, Math.round(255 * ratio));
    }

    const skinShade = tint(skin, -18);
    const skinLight = tint(skin, 18);
    const hairShade = tint(hair, -26);
    const hairLight = tint(hair, 14);
    const topShade = tint(topColor, -22);
    const topLight = tint(topColor, 14);
    const bottomShade = tint(bottomColor, -20);
    const bottomLight = tint(bottomColor, 12);
    const shoeColor = tint(bottomColor, -44);
    const shoeLight = tint(shoeColor, 24);

    fillRect(sctx, 8 * unit, 29 * unit, 16 * unit, 2 * unit, "rgba(42,34,30,0.22)");

    if (acc.includes("月光披风")) {
      fillRect(sctx, 9 * unit, 16 * unit, 14 * unit, 12 * unit, "#e7e3f3");
      fillRect(sctx, 10 * unit, 16 * unit, 3 * unit, 12 * unit, "#c9c0df");
      fillRect(sctx, 19 * unit, 16 * unit, 3 * unit, 12 * unit, "#c9c0df");
    }

    fillRect(sctx, 10 * unit, 4 * unit, 12 * unit, 12 * unit, skin);
    fillRect(sctx, 10 * unit, 4 * unit, 2 * unit, 12 * unit, skinLight);
    fillRect(sctx, 20 * unit, 4 * unit, 2 * unit, 12 * unit, skinShade);
    fillRect(sctx, 12 * unit, 15 * unit, 8 * unit, 1 * unit, tint(skin, -10));

    if (hairStyle !== "光头") {
      if (hairStyle === "短发") {
        fillRect(sctx, 10 * unit, 3 * unit, 12 * unit, 4 * unit, hair);
        fillRect(sctx, 10 * unit, 3 * unit, 2 * unit, 4 * unit, hairLight);
        fillRect(sctx, 20 * unit, 3 * unit, 2 * unit, 4 * unit, hairShade);
        fillRect(sctx, 10 * unit, 7 * unit, 1 * unit, 7 * unit, hair);
        fillRect(sctx, 21 * unit, 7 * unit, 1 * unit, 7 * unit, hairShade);
        fillRect(sctx, 11 * unit, 7 * unit, 10 * unit, 2 * unit, hair);
      } else if (hairStyle === "碎刘海") {
        fillRect(sctx, 10 * unit, 3 * unit, 12 * unit, 4 * unit, hair);
        fillRect(sctx, 10 * unit, 3 * unit, 2 * unit, 4 * unit, hairLight);
        fillRect(sctx, 20 * unit, 3 * unit, 2 * unit, 4 * unit, hairShade);
        fillRect(sctx, 10 * unit, 7 * unit, 1 * unit, 7 * unit, hair);
        fillRect(sctx, 21 * unit, 7 * unit, 1 * unit, 7 * unit, hairShade);
        fillRect(sctx, 11 * unit, 5 * unit, 4 * unit, 1 * unit, hair);
        fillRect(sctx, 17 * unit, 5 * unit, 4 * unit, 1 * unit, hairShade);
        fillRect(sctx, 10 * unit, 6 * unit, 6 * unit, 1 * unit, hairLight);
        fillRect(sctx, 16 * unit, 6 * unit, 6 * unit, 1 * unit, hairShade);
        fillRect(sctx, 11 * unit, 7 * unit, 3 * unit, 1 * unit, hair);
        fillRect(sctx, 15 * unit, 7 * unit, 2 * unit, 1 * unit, hair);
        fillRect(sctx, 18 * unit, 7 * unit, 3 * unit, 1 * unit, hairShade);
        fillRect(sctx, 12 * unit, 8 * unit, 2 * unit, 1 * unit, hair);
        fillRect(sctx, 16 * unit, 8 * unit, 2 * unit, 1 * unit, hair);
      } else if (hairStyle === "中式丸子头") {
        fillRect(sctx, 9 * unit, 3 * unit, 14 * unit, 4 * unit, hair);
        fillRect(sctx, 9 * unit, 3 * unit, 2 * unit, 4 * unit, hairLight);
        fillRect(sctx, 21 * unit, 3 * unit, 2 * unit, 4 * unit, hairShade);
        fillRect(sctx, 9 * unit, 7 * unit, 2 * unit, 7 * unit, hair);
        fillRect(sctx, 21 * unit, 7 * unit, 2 * unit, 7 * unit, hairShade);
        fillRect(sctx, 12 * unit, 7 * unit, 8 * unit, 3 * unit, hair);
        fillRect(sctx, 8 * unit, 9 * unit, 2 * unit, 6 * unit, hairLight);
        fillRect(sctx, 22 * unit, 9 * unit, 2 * unit, 6 * unit, hairShade);
      } else {
      fillRect(sctx, 9 * unit, 3 * unit, 14 * unit, 4 * unit, hair);
      fillRect(sctx, 9 * unit, 3 * unit, 2 * unit, 4 * unit, hairLight);
      fillRect(sctx, 21 * unit, 3 * unit, 2 * unit, 4 * unit, hairShade);
      fillRect(sctx, 9 * unit, 7 * unit, 2 * unit, 7 * unit, hair);
      fillRect(sctx, 21 * unit, 7 * unit, 2 * unit, 7 * unit, hairShade);

      if (hairStyle === "波波头") {
        fillRect(sctx, 8 * unit, 6 * unit, 3 * unit, 10 * unit, hairLight);
        fillRect(sctx, 21 * unit, 6 * unit, 3 * unit, 10 * unit, hairShade);
        fillRect(sctx, 11 * unit, 7 * unit, 10 * unit, 3 * unit, hair);
        fillRect(sctx, 10 * unit, 13 * unit, 2 * unit, 2 * unit, hairLight);
        fillRect(sctx, 20 * unit, 13 * unit, 2 * unit, 2 * unit, hairShade);
      } else if (hairStyle === "高马尾") {
        fillRect(sctx, 11 * unit, 7 * unit, 10 * unit, 2 * unit, hair);
        fillRect(sctx, 20 * unit, 2 * unit, 4 * unit, 4 * unit, hairShade);
        fillRect(sctx, 22 * unit, 6 * unit, 3 * unit, 11 * unit, hairShade);
        fillRect(sctx, 22 * unit, 14 * unit, 2 * unit, 6 * unit, hair);
        fillRect(sctx, 8 * unit, 8 * unit, 2 * unit, 6 * unit, hairLight);
      } else if (hairStyle === "锅盖头") {
        fillRect(sctx, 8 * unit, 5 * unit, 16 * unit, 5 * unit, hair);
        fillRect(sctx, 9 * unit, 10 * unit, 14 * unit, 2 * unit, hairShade);
        fillRect(sctx, 8 * unit, 8 * unit, 2 * unit, 6 * unit, hairLight);
        fillRect(sctx, 22 * unit, 8 * unit, 2 * unit, 6 * unit, hairShade);
      } else if (hairStyle === "刺头") {
        fillRect(sctx, 11 * unit, 6 * unit, 10 * unit, 2 * unit, hair);
        fillRect(sctx, 10 * unit, 7 * unit, 2 * unit, 2 * unit, hairLight);
        fillRect(sctx, 20 * unit, 7 * unit, 2 * unit, 2 * unit, hairShade);
        fillRect(sctx, 10 * unit, 4 * unit, 2 * unit, 3 * unit, hairLight);
        fillRect(sctx, 13 * unit, 2 * unit, 2 * unit, 5 * unit, hair);
        fillRect(sctx, 16 * unit, 1 * unit, 2 * unit, 6 * unit, hairLight);
        fillRect(sctx, 19 * unit, 3 * unit, 2 * unit, 4 * unit, hairShade);
      } else if (hairStyle === "微分碎盖") {
        // 上稍宽、下收紧的碎发轮廓，参考氛围感男生发型
        // 顶部层：略宽，有轻微不对称分缝
        fillRect(sctx, 10 * unit, 4 * unit, 12 * unit, 2 * unit, hair);
        fillRect(sctx, 10 * unit, 4 * unit, 3 * unit, 2 * unit, hairLight);
        fillRect(sctx, 19 * unit, 4 * unit, 3 * unit, 2 * unit, hairShade);
        // 中段：比顶部略窄一点
        fillRect(sctx, 11 * unit, 6 * unit, 10 * unit, 2 * unit, hair);
        fillRect(sctx, 11 * unit, 6 * unit, 2 * unit, 2 * unit, hairLight);
        fillRect(sctx, 19 * unit, 6 * unit, 2 * unit, 2 * unit, hairShade);
        // 下段：再收窄，贴近脸部
        fillRect(sctx, 12 * unit, 8 * unit, 8 * unit, 3 * unit, hair);
        // 侧边碎发（上宽下窄的外轮廓）
        fillRect(sctx, 9 * unit, 6 * unit, 2 * unit, 5 * unit, hairLight);
        fillRect(sctx, 8 * unit, 8 * unit, 1 * unit, 3 * unit, hairLight);
        fillRect(sctx, 21 * unit, 6 * unit, 2 * unit, 5 * unit, hairShade);
        fillRect(sctx, 23 * unit, 8 * unit, 1 * unit, 3 * unit, hairShade);
        // 顶部几撮碎发高光/暗影
        fillRect(sctx, 13 * unit, 5 * unit, 2 * unit, 1 * unit, hairLight);
        fillRect(sctx, 17 * unit, 5 * unit, 2 * unit, 1 * unit, hairShade);
      } else if (hairStyle === "爆炸头") {
        // 爆炸头：下窄 → 中段最宽（比肩膀更宽）→ 顶部再收窄，左右对称
        // 底部（最靠近额头，略窄）
        fillRect(sctx, 12 * unit, 7 * unit, 8 * unit, 2 * unit, hair);
        // 中下层
        fillRect(sctx, 11 * unit, 6 * unit, 10 * unit, 2 * unit, hair);
        // 中层（最宽：x=7..25，比肩膀更外扩）
        fillRect(sctx, 7 * unit, 5 * unit, 18 * unit, 2 * unit, hair);
        // 上中层（略收窄，保持圆感）
        fillRect(sctx, 8 * unit, 4 * unit, 16 * unit, 2 * unit, hair);
        // 顶部再收窄
        fillRect(sctx, 9 * unit, 3 * unit, 14 * unit, 1 * unit, hair);
        fillRect(sctx, 11 * unit, 2 * unit, 10 * unit, 1 * unit, hair);

        // 左侧高光边缘（对称炸开，间隔外扩）
        fillRect(sctx, 7 * unit, 5 * unit, 1 * unit, 4 * unit, hairLight);
        fillRect(sctx, 6 * unit, 6 * unit, 1 * unit, 3 * unit, hairLight);
        fillRect(sctx, 8 * unit, 3 * unit, 1 * unit, 2 * unit, hairLight);

        // 右侧阴影边缘（与左侧对称）
        fillRect(sctx, 24 * unit, 5 * unit, 1 * unit, 4 * unit, hairShade);
        fillRect(sctx, 25 * unit, 6 * unit, 1 * unit, 3 * unit, hairShade);
        fillRect(sctx, 23 * unit, 3 * unit, 1 * unit, 2 * unit, hairShade);

        // 顶部零散高光/暗影点
        fillRect(sctx, 13 * unit, 3 * unit, 2 * unit, 1 * unit, hairLight);
        fillRect(sctx, 17 * unit, 3 * unit, 2 * unit, 1 * unit, hairShade);
      } else if (hairStyle === "丸子头") {
        fillRect(sctx, 14 * unit, 1 * unit, 4 * unit, 1 * unit, hair);
        fillRect(sctx, 13 * unit, 2 * unit, 6 * unit, 1 * unit, hair);
        fillRect(sctx, 14 * unit, 3 * unit, 4 * unit, 1 * unit, hair);
        fillRect(sctx, 14 * unit, 1 * unit, 1 * unit, 2 * unit, hairLight);
        fillRect(sctx, 15 * unit, 1 * unit, 1 * unit, 2 * unit, hairLight);
        fillRect(sctx, 17 * unit, 1 * unit, 1 * unit, 2 * unit, hairShade);
        fillRect(sctx, 11 * unit, 7 * unit, 10 * unit, 2 * unit, hair);
        fillRect(sctx, 9 * unit, 8 * unit, 2 * unit, 7 * unit, hairLight);
        fillRect(sctx, 21 * unit, 8 * unit, 2 * unit, 7 * unit, hairShade);
        fillRect(sctx, 10 * unit, 13 * unit, 1 * unit, 2 * unit, hairLight);
        fillRect(sctx, 21 * unit, 13 * unit, 1 * unit, 2 * unit, hairShade);
      } else if (hairStyle === "双丸子头") {
        // 底部左右各一个丸子
        fillRect(sctx, 11 * unit, 7 * unit, 10 * unit, 2 * unit, hair);
        fillRect(sctx, 9 * unit, 8 * unit, 2 * unit, 7 * unit, hairLight);
        fillRect(sctx, 21 * unit, 8 * unit, 2 * unit, 7 * unit, hairShade);
        // 左丸子
        fillRect(sctx, 7 * unit, 13 * unit, 3 * unit, 3 * unit, hairLight);
        fillRect(sctx, 8 * unit, 12 * unit, 2 * unit, 1 * unit, hair);
        fillRect(sctx, 9 * unit, 13 * unit, 1 * unit, 3 * unit, hairShade);
        // 右丸子
        fillRect(sctx, 22 * unit, 13 * unit, 3 * unit, 3 * unit, hairShade);
        fillRect(sctx, 22 * unit, 12 * unit, 2 * unit, 1 * unit, hair);
        fillRect(sctx, 22 * unit, 13 * unit, 1 * unit, 3 * unit, hairLight);
      } else if (hairStyle === "大波浪") {
        // 长发大波浪：上窄下宽，外轮廓呈梯形（两侧不在上方外鼓）
        fillRect(sctx, 11 * unit, 4 * unit, 10 * unit, 4 * unit, hair);
        fillRect(sctx, 11 * unit, 4 * unit, 2 * unit, 4 * unit, hairLight);
        fillRect(sctx, 19 * unit, 4 * unit, 2 * unit, 4 * unit, hairShade);
        fillRect(sctx, 12 * unit, 3 * unit, 8 * unit, 1 * unit, hair);
        fillRect(sctx, 12 * unit, 3 * unit, 1 * unit, 1 * unit, hairLight);
        fillRect(sctx, 19 * unit, 3 * unit, 1 * unit, 1 * unit, hairShade);

        // 左侧梯形边（从 y=8 起斜向外，不再在头顶两侧鼓出）
        fillRect(sctx, 9 * unit, 8 * unit, 2 * unit, 4 * unit, hairLight);
        fillRect(sctx, 8 * unit, 12 * unit, 2 * unit, 4 * unit, hairLight);
        fillRect(sctx, 7 * unit, 16 * unit, 2 * unit, 4 * unit, hairLight);
        fillRect(sctx, 6 * unit, 20 * unit, 2 * unit, 5 * unit, hairLight);
        fillRect(sctx, 5 * unit, 21 * unit, 1 * unit, 4 * unit, hairLight);
        fillRect(sctx, 10 * unit, 8 * unit, 1 * unit, 4 * unit, hair);
        fillRect(sctx, 9 * unit, 12 * unit, 2 * unit, 4 * unit, hair);
        fillRect(sctx, 8 * unit, 16 * unit, 2 * unit, 4 * unit, hair);
        fillRect(sctx, 7 * unit, 20 * unit, 2 * unit, 5 * unit, hair);
        fillRect(sctx, 6 * unit, 21 * unit, 1 * unit, 4 * unit, hair);

        // 右侧梯形边（对称）
        fillRect(sctx, 21 * unit, 8 * unit, 2 * unit, 4 * unit, hairShade);
        fillRect(sctx, 22 * unit, 12 * unit, 2 * unit, 4 * unit, hairShade);
        fillRect(sctx, 23 * unit, 16 * unit, 2 * unit, 4 * unit, hairShade);
        fillRect(sctx, 24 * unit, 20 * unit, 2 * unit, 5 * unit, hairShade);
        fillRect(sctx, 25 * unit, 21 * unit, 1 * unit, 4 * unit, hairShade);
        fillRect(sctx, 20 * unit, 8 * unit, 1 * unit, 4 * unit, hair);
        fillRect(sctx, 21 * unit, 12 * unit, 2 * unit, 4 * unit, hair);
        fillRect(sctx, 22 * unit, 16 * unit, 2 * unit, 4 * unit, hair);
        fillRect(sctx, 23 * unit, 20 * unit, 2 * unit, 5 * unit, hair);
        fillRect(sctx, 24 * unit, 21 * unit, 1 * unit, 4 * unit, hair);
        // 左额刘海（红圈区域：发际线到左眼上方）
        fillRect(sctx, 10 * unit, 5 * unit, 1 * unit, 1 * unit, hairLight);
        fillRect(sctx, 11 * unit, 5 * unit, 1 * unit, 1 * unit, hair);
        fillRect(sctx, 10 * unit, 6 * unit, 2 * unit, 1 * unit, hair);
        fillRect(sctx, 11 * unit, 6 * unit, 1 * unit, 1 * unit, hairLight);
        fillRect(sctx, 10 * unit, 7 * unit, 3 * unit, 1 * unit, hair);
        fillRect(sctx, 10 * unit, 7 * unit, 1 * unit, 1 * unit, hairLight);
        fillRect(sctx, 10 * unit, 8 * unit, 2 * unit, 1 * unit, hair);
        fillRect(sctx, 11 * unit, 9 * unit, 1 * unit, 1 * unit, hair);
      } else if (hairStyle === "长直发") {
        // 长直发：从头顶两侧略外扩，然后垂直到上装中部，两侧可见中间不盖住上装
        // 顶部略宽
        // 外轮廓向外加宽（内侧轮廓不变）
        fillRect(sctx, 9 * unit, 4 * unit, 14 * unit, 3 * unit, hair);
        fillRect(sctx, 9 * unit, 4 * unit, 2 * unit, 3 * unit, hairLight);
        fillRect(sctx, 21 * unit, 4 * unit, 2 * unit, 3 * unit, hairShade);
        // 顶部与侧边的转角更自然：左右各向下补 2 格
        fillRect(sctx, 8 * unit, 5 * unit, 1 * unit, 2 * unit, hairLight);
        fillRect(sctx, 23 * unit, 5 * unit, 1 * unit, 2 * unit, hairShade);
        // 左右长直发柱，从稍靠外的位置垂直到上装中部
        fillRect(sctx, 7 * unit, 7 * unit, 4 * unit, 15 * unit, hairLight);
        fillRect(sctx, 21 * unit, 7 * unit, 4 * unit, 15 * unit, hairShade);
        // 内侧一点的直发，让上下更自然
        fillRect(sctx, 10 * unit, 8 * unit, 1 * unit, 12 * unit, hair);
        fillRect(sctx, 21 * unit, 8 * unit, 1 * unit, 12 * unit, hair);
      } else if (hairStyle === "双麻花辫") {
        fillRect(sctx, 11 * unit, 7 * unit, 10 * unit, 2 * unit, hair);
        fillRect(sctx, 8 * unit, 8 * unit, 3 * unit, 15 * unit, hairLight);
        fillRect(sctx, 21 * unit, 8 * unit, 3 * unit, 15 * unit, hairShade);
        fillRect(sctx, 8 * unit, 12 * unit, 3 * unit, 2 * unit, hair);
        fillRect(sctx, 21 * unit, 12 * unit, 3 * unit, 2 * unit, hair);
        fillRect(sctx, 8 * unit, 17 * unit, 3 * unit, 2 * unit, hair);
        fillRect(sctx, 21 * unit, 17 * unit, 3 * unit, 2 * unit, hair);
        fillRect(sctx, 8 * unit, 21 * unit, 3 * unit, 2 * unit, hair);
        fillRect(sctx, 21 * unit, 21 * unit, 3 * unit, 2 * unit, hair);
      } else if (hairStyle === "侧麻花辫") {
        fillRect(sctx, 11 * unit, 7 * unit, 10 * unit, 2 * unit, hair);
        fillRect(sctx, 8 * unit, 8 * unit, 3 * unit, 15 * unit, hairLight);
        fillRect(sctx, 8 * unit, 12 * unit, 3 * unit, 2 * unit, hair);
        fillRect(sctx, 8 * unit, 17 * unit, 3 * unit, 2 * unit, hair);
        fillRect(sctx, 8 * unit, 21 * unit, 3 * unit, 2 * unit, hair);
        fillRect(sctx, 21 * unit, 8 * unit, 2 * unit, 6 * unit, hairShade);
      } else {
        fillRect(sctx, 12 * unit, 7 * unit, 8 * unit, 3 * unit, hair);
        fillRect(sctx, 8 * unit, 9 * unit, 2 * unit, 6 * unit, hairLight);
        fillRect(sctx, 22 * unit, 9 * unit, 2 * unit, 6 * unit, hairShade);
      }
      }
    }
    if (acc.includes("星星发夹") || acc.includes("小花发夹") || acc.includes("叶子发夹")) {
      let cross = "#e77fb1";
      let bar = "#fff0b5";
      if (acc.includes("小花发夹")) {
        // 前面十字：浅红；后面衬底：深红
        // 注意：这里 cross 是“后面衬底”，bar 是“前面十字”（因为绘制顺序是先画 cross 再画 bar）
        cross = "#b24d4d"; // 后面：深红
        bar = "#e06a4f";   // 前面：浅红（偏红、不偏粉）
      } else if (acc.includes("叶子发夹")) {
        cross = "#24593a";      // 墨绿色十字
        bar = "#3b6b3f";        // 深绿色衬底
      }
      fillRect(sctx, 19 * unit, 5 * unit, 3 * unit, 3 * unit, cross);
      fillRect(sctx, 20 * unit, 4 * unit, 1 * unit, 5 * unit, bar);
      fillRect(sctx, 18 * unit, 6 * unit, 5 * unit, 1 * unit, bar);
      if (acc.includes("小花发夹")) {
        // 中心像素：米白色高光
        fillRect(sctx, 20 * unit, 6 * unit, 1 * unit, 1 * unit, "#f8f3dc");
      }
    }
    if (acc.includes("金色桂冠")) {
      // 金色桂冠：左右叶片花环（不复用王冠的尖顶结构）
      const leafHi = "#ffe6a6";
      const leaf = "#f2c14e";
      const leafShade = "#c98b2a";
      const outline = "#8a5b2c";
      const stem = "#b57a2a";
      // 左侧叶簇
      // 下移 2px（1 格），并加深描边让叶片轮廓更清晰
      fillRect(sctx, 9 * unit, 5 * unit, 4 * unit, 1 * unit, outline);
      fillRect(sctx, 10 * unit, 4 * unit, 3 * unit, 1 * unit, outline);
      fillRect(sctx, 9 * unit, 6 * unit, 2 * unit, 1 * unit, outline);
      fillRect(sctx, 9 * unit, 5 * unit, 2 * unit, 1 * unit, leafShade);
      fillRect(sctx, 10 * unit, 4 * unit, 2 * unit, 1 * unit, leaf);
      fillRect(sctx, 11 * unit, 3 * unit, 2 * unit, 1 * unit, leafHi);
      fillRect(sctx, 9 * unit, 6 * unit, 3 * unit, 1 * unit, leaf);
      fillRect(sctx, 10 * unit, 7 * unit, 3 * unit, 1 * unit, leafShade);
      // 右侧叶簇（镜像）
      fillRect(sctx, 19 * unit, 5 * unit, 4 * unit, 1 * unit, outline);
      fillRect(sctx, 19 * unit, 4 * unit, 3 * unit, 1 * unit, outline);
      fillRect(sctx, 21 * unit, 6 * unit, 2 * unit, 1 * unit, outline);
      fillRect(sctx, 21 * unit, 5 * unit, 2 * unit, 1 * unit, leafShade);
      fillRect(sctx, 20 * unit, 4 * unit, 2 * unit, 1 * unit, leaf);
      fillRect(sctx, 19 * unit, 3 * unit, 2 * unit, 1 * unit, leafHi);
      fillRect(sctx, 20 * unit, 6 * unit, 3 * unit, 1 * unit, leaf);
      fillRect(sctx, 19 * unit, 7 * unit, 3 * unit, 1 * unit, leafShade);
      // 中间细枝（弱存在感，避免像王冠横条）
      fillRect(sctx, 12 * unit, 5 * unit, 8 * unit, 1 * unit, stem);
      fillRect(sctx, 13 * unit, 4 * unit, 6 * unit, 1 * unit, leafHi);
      // 小浆果/扣件点缀
      fillRect(sctx, 12 * unit, 6 * unit, 1 * unit, 1 * unit, "#d0812e");
      fillRect(sctx, 19 * unit, 6 * unit, 1 * unit, 1 * unit, "#d0812e");
    }

    if (acc.includes("桂冠")) {
      // 绿叶桂冠：同造型改用绿色调
      // 墨绿色系：更低调、浅绿高光更“灰”一些
      const leafHi = "#9fd6b0";      // 最上层浅绿（降饱和）
      const leaf = "#1f5a45";        // 主叶色（更深）
      const leafShade = "#14382c";   // 叶脉暗影（更沉）
      const outline = "#0c2f24";     // 外轮廓（更深沉）
      const stem = "#1b4a3a";        // 枝干
      const decoBase = "#cfd4dd";    // 银色缀饰底
      const decoHi = "#f5f7fb";      // 银色高光
      const decoShadow = "#a1a6b1";  // 银色暗影
      // 左侧叶簇
      fillRect(sctx, 9 * unit, 5 * unit, 4 * unit, 1 * unit, outline);
      fillRect(sctx, 10 * unit, 4 * unit, 3 * unit, 1 * unit, outline);
      fillRect(sctx, 9 * unit, 6 * unit, 2 * unit, 1 * unit, outline);
      fillRect(sctx, 9 * unit, 5 * unit, 2 * unit, 1 * unit, leafShade);
      fillRect(sctx, 10 * unit, 4 * unit, 2 * unit, 1 * unit, leaf);
      fillRect(sctx, 11 * unit, 3 * unit, 2 * unit, 1 * unit, leafHi);
      fillRect(sctx, 9 * unit, 6 * unit, 3 * unit, 1 * unit, leaf);
      fillRect(sctx, 10 * unit, 7 * unit, 3 * unit, 1 * unit, leafShade);
      // 右侧叶簇（镜像）
      fillRect(sctx, 19 * unit, 5 * unit, 4 * unit, 1 * unit, outline);
      fillRect(sctx, 19 * unit, 4 * unit, 3 * unit, 1 * unit, outline);
      fillRect(sctx, 21 * unit, 6 * unit, 2 * unit, 1 * unit, outline);
      fillRect(sctx, 21 * unit, 5 * unit, 2 * unit, 1 * unit, leafShade);
      fillRect(sctx, 20 * unit, 4 * unit, 2 * unit, 1 * unit, leaf);
      fillRect(sctx, 19 * unit, 3 * unit, 2 * unit, 1 * unit, leafHi);
      fillRect(sctx, 20 * unit, 6 * unit, 3 * unit, 1 * unit, leaf);
      fillRect(sctx, 19 * unit, 7 * unit, 3 * unit, 1 * unit, leafShade);
      // 中间细枝
      fillRect(sctx, 12 * unit, 5 * unit, 8 * unit, 1 * unit, stem);
      fillRect(sctx, 13 * unit, 4 * unit, 6 * unit, 1 * unit, leafHi);
      // 银色“扣件/小宝石”
      fillRect(sctx, 12 * unit, 6 * unit, 1 * unit, 1 * unit, decoBase);
      fillRect(sctx, 19 * unit, 6 * unit, 1 * unit, 1 * unit, decoHi);
    }

    if (acc.includes("精灵额冠")) {
      const silver = "#cfd4dd";
      const silverHi = "#f5f7fb";
      const silverShade = "#a1a6b1";
      const wire = "#939ab0";
      const gemBase = "#3b82f6";
      const gemHi = "#93c5fd";

      // 1. 贴额弧带 (y=6..7) - 整体左右更偏左
      // y=6 层
      fillRect(sctx, 11 * unit, 6 * unit, 2 * unit, 1 * unit, silverShade); // 左翼
      fillRect(sctx, 13 * unit, 6 * unit, 5 * unit, 1 * unit, silver);      // 中心 (13..17)
      fillRect(sctx, 18 * unit, 6 * unit, 2 * unit, 1 * unit, silverShade); // 右翼

      // y=7 层 (高亮)
      fillRect(sctx, 11 * unit, 7 * unit, 2 * unit, 1 * unit, silver);
      fillRect(sctx, 13 * unit, 7 * unit, 5 * unit, 1 * unit, silverHi);
      fillRect(sctx, 18 * unit, 7 * unit, 2 * unit, 1 * unit, silver);

      // 2. 两侧装饰细线 (中心轴 x=15)
      fillRect(sctx, 12 * unit, 5 * unit, 1 * unit, 1 * unit, wire); // 左上
      fillRect(sctx, 18 * unit, 5 * unit, 1 * unit, 1 * unit, wire); // 右上
      fillRect(sctx, 11 * unit, 8 * unit, 1 * unit, 1 * unit, wire); // 左下
      fillRect(sctx, 19 * unit, 8 * unit, 1 * unit, 1 * unit, wire); // 右下

      // 3. 正V凹槽 (以 x=15 为轴对称)
      fillRect(sctx, 14 * unit, 8 * unit, 1 * unit, 1 * unit, wire); // V左侧
      fillRect(sctx, 16 * unit, 8 * unit, 1 * unit, 1 * unit, wire); // V右侧
      fillRect(sctx, 15 * unit, 9 * unit, 1 * unit, 1 * unit, wire); // V尖端

      // 4. 宝石 (精准放置在 x=15 轴线上)
      fillRect(sctx, 15 * unit, 8 * unit, 1 * unit, 1 * unit, gemBase);
      fillRect(sctx, 15 * unit, 7 * unit, 1 * unit, 1 * unit, gemHi);
    }

    if (acc.includes("金色王冠") || acc.includes("月光王冠") || acc.includes("黄铜王冠")) {
      // 基于同一像素分布，不同配色
      let band = "#d9b54a";
      let topGem = "#f4df82";
      let crownPeak = "#f0c63c";
      let crownPeakShade = "#c9972e";
      let bandDark = "#b8862d";
      let bandHighlight = "#f8e9a3";
      let smallHighlight = "#fff3bf";
      let sideGem = "#e27aa8";
      if (acc.includes("月光王冠")) {
        // 银色 + 蓝宝石
        band = "#c5cbd9";
        topGem = "#eef1ff";
        crownPeak = "#9fb5ff";
        crownPeakShade = "#7b8fb9";
        bandDark = "#939ab0";
        bandHighlight = "#e6eaf6";
        smallHighlight = "#f1f4ff";
        sideGem = "#74b2ff";
      } else if (acc.includes("黄铜王冠")) {
        // 黄铜色 + 绿色宝石
        band = "#c0904a";
        topGem = "#f0d08a";
        crownPeak = "#b3782f";
        crownPeakShade = "#8e5a23";
        bandDark = "#80502b";
        bandHighlight = "#f6e1b0";
        smallHighlight = "#ffecc0";
        sideGem = "#4c9b5b";
      }
      // 三款王冠整体下移，让高度与桂冠更接近
      fillRect(sctx, 11 * unit, 4 * unit, 10 * unit, 2 * unit, band);
      fillRect(sctx, 12 * unit, 3 * unit, 2 * unit, 2 * unit, topGem);
      fillRect(sctx, 15 * unit, 2 * unit, 2 * unit, 3 * unit, crownPeak);
      fillRect(sctx, 18 * unit, 3 * unit, 2 * unit, 2 * unit, crownPeakShade);
      fillRect(sctx, 12 * unit, 5 * unit, 8 * unit, 1 * unit, bandDark);
      fillRect(sctx, 13 * unit, 4 * unit, 1 * unit, 1 * unit, bandHighlight);
      fillRect(sctx, 16 * unit, 3 * unit, 1 * unit, 1 * unit, smallHighlight);
      fillRect(sctx, 18 * unit, 4 * unit, 1 * unit, 1 * unit, sideGem);
    }
    if (acc.includes("头盔")) {
      // 简易头盔（保证不盖住眼睛区域）
      fillRect(sctx, 9 * unit, 4 * unit, 14 * unit, 1 * unit, "#6e6e6e");
      fillRect(sctx, 10 * unit, 5 * unit, 12 * unit, 4 * unit, "#5c5c5c");
      fillRect(sctx, 11 * unit, 6 * unit, 10 * unit, 1 * unit, "#7a7a7a");
      // 面甲/护目镜
      fillRect(sctx, 13 * unit, 7 * unit, 6 * unit, 2 * unit, "#2f2724");
      fillRect(sctx, 13 * unit, 6 * unit, 6 * unit, 1 * unit, "#3b3b3b");
      // 两侧护颊
      fillRect(sctx, 8 * unit, 7 * unit, 2 * unit, 3 * unit, "#4a4a4a");
      fillRect(sctx, 22 * unit, 7 * unit, 2 * unit, 3 * unit, "#4a4a4a");
    }
    if (acc.includes("围巾") || acc.includes("奶油围巾") || acc.includes("秋日围巾")) {
      let base = "#d74f4f";
      let light = "#f08d8d";
      let dark = "#9f2f2f";
      if (acc.includes("奶油围巾")) {
        base = "#e8d8b8";
        light = "#f7f0d8";
        dark = "#c6b28c";
      } else if (acc.includes("秋日围巾")) {
        base = "#c28a4a";
        light = "#e0b57a";
        dark = "#8a5b2c";
      }
      fillRect(sctx, 11 * unit, 17 * unit, 10 * unit, 2 * unit, base);
      fillRect(sctx, 11 * unit, 17 * unit, 2 * unit, 2 * unit, light);
      fillRect(sctx, 19 * unit, 17 * unit, 2 * unit, 2 * unit, dark);
      fillRect(sctx, 16 * unit, 19 * unit, 3 * unit, 7 * unit, base);
      fillRect(sctx, 18 * unit, 19 * unit, 1 * unit, 7 * unit, dark);
      fillRect(sctx, 16 * unit, 25 * unit, 3 * unit, 1 * unit, light);
    }
    if (acc.includes("法师帽")) {
      fillRect(sctx, 7 * unit, 5 * unit, 18 * unit, 2 * unit, "#33285a");
      fillRect(sctx, 8 * unit, 6 * unit, 16 * unit, 1 * unit, "#1f173f");
      fillRect(sctx, 11 * unit, 4 * unit, 10 * unit, 1 * unit, "#4a3d7a");
      fillRect(sctx, 12 * unit, 3 * unit, 8 * unit, 1 * unit, "#5c4e90");
      fillRect(sctx, 13 * unit, 2 * unit, 6 * unit, 1 * unit, "#4a3d7a");
      fillRect(sctx, 14 * unit, 1 * unit, 5 * unit, 1 * unit, "#715fb4");
      fillRect(sctx, 16 * unit, 0 * unit, 2 * unit, 1 * unit, "#8c79d9");
      fillRect(sctx, 18 * unit, 1 * unit, 2 * unit, 1 * unit, "#715fb4");
      fillRect(sctx, 15 * unit, 4 * unit, 2 * unit, 2 * unit, "#1f6c56");
      fillRect(sctx, 15 * unit, 4 * unit, 1 * unit, 1 * unit, "#49a58a");
      fillRect(sctx, 16 * unit, 5 * unit, 1 * unit, 1 * unit, "#0f3f33");
    }
    if (acc.includes("黑色巫师帽")) {
      // 与法师帽同款，整体改为黑灰色系，宝石改为银色
      fillRect(sctx, 7 * unit, 5 * unit, 18 * unit, 2 * unit, "#2a2834");
      fillRect(sctx, 8 * unit, 6 * unit, 16 * unit, 1 * unit, "#15141c");
      fillRect(sctx, 11 * unit, 4 * unit, 10 * unit, 1 * unit, "#3b3a48");
      fillRect(sctx, 12 * unit, 3 * unit, 8 * unit, 1 * unit, "#4a4958");
      fillRect(sctx, 13 * unit, 2 * unit, 6 * unit, 1 * unit, "#3b3a48");
      fillRect(sctx, 14 * unit, 1 * unit, 5 * unit, 1 * unit, "#5a5868");
      fillRect(sctx, 16 * unit, 0 * unit, 2 * unit, 1 * unit, "#767482");
      fillRect(sctx, 18 * unit, 1 * unit, 2 * unit, 1 * unit, "#5a5868");
      // 银色宝石
      fillRect(sctx, 15 * unit, 4 * unit, 2 * unit, 2 * unit, "#cfd4dd");
      fillRect(sctx, 15 * unit, 4 * unit, 1 * unit, 1 * unit, "#f5f7fb");
      fillRect(sctx, 16 * unit, 5 * unit, 1 * unit, 1 * unit, "#a1a6b1");
    }
    if (!acc.includes("像素护目镜") && eyeStyle === "亮眼") {
      fillRect(sctx, 12 * unit, 10 * unit, 3 * unit, 3 * unit, "#f8f8fb");
      fillRect(sctx, 17 * unit, 10 * unit, 3 * unit, 3 * unit, "#f8f8fb");
      fillRect(sctx, 13 * unit, 11 * unit, 1 * unit, 2 * unit, eyeColor);
      fillRect(sctx, 18 * unit, 11 * unit, 1 * unit, 2 * unit, eyeColor);
      fillRect(sctx, 12 * unit, 10 * unit, 1 * unit, 1 * unit, "#ffffff");
      fillRect(sctx, 17 * unit, 10 * unit, 1 * unit, 1 * unit, "#ffffff");
    } else if (eyeStyle === "大眼") {
      fillRect(sctx, 12 * unit, 10 * unit, 3 * unit, 4 * unit, "#f8f8fb");
      fillRect(sctx, 17 * unit, 10 * unit, 3 * unit, 4 * unit, "#f8f8fb");
      fillRect(sctx, 13 * unit, 11 * unit, 1 * unit, 2 * unit, eyeColor);
      fillRect(sctx, 18 * unit, 11 * unit, 1 * unit, 2 * unit, eyeColor);
      fillRect(sctx, 13 * unit, 13 * unit, 1 * unit, 1 * unit, lightenColor(eyeColor, 0.28));
      fillRect(sctx, 18 * unit, 13 * unit, 1 * unit, 1 * unit, lightenColor(eyeColor, 0.28));
      fillRect(sctx, 12 * unit, 10 * unit, 1 * unit, 1 * unit, "#ffffff");
      fillRect(sctx, 17 * unit, 10 * unit, 1 * unit, 1 * unit, "#ffffff");
    } else if (eyeStyle === "瞪眼") {
      fillRect(sctx, 12 * unit, 10 * unit, 3 * unit, 3 * unit, "#fbfbfd");
      fillRect(sctx, 17 * unit, 10 * unit, 3 * unit, 3 * unit, "#fbfbfd");
      fillRect(sctx, 13 * unit, 11 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 18 * unit, 11 * unit, 1 * unit, 1 * unit, eyeColor);
    } else if (eyeStyle === "豆豆眼" || eyeStyle === "空瞳") {
      const dotColor = eyeStyle === "空瞳" ? "#ffffff" : eyeColor;
      const dotHighlight = eyeStyle === "空瞳" ? "#ffffff" : lightenColor(eyeColor, 0.18);
      fillRect(sctx, 12 * unit, 11 * unit, 2 * unit, 2 * unit, dotColor);
      fillRect(sctx, 18 * unit, 11 * unit, 2 * unit, 2 * unit, dotColor);
      fillRect(sctx, 12 * unit, 11 * unit, 1 * unit, 1 * unit, dotHighlight);
      fillRect(sctx, 18 * unit, 11 * unit, 1 * unit, 1 * unit, dotHighlight);
    } else if (eyeStyle === "眯眼") {
      fillRect(sctx, 12 * unit, 11 * unit, 3 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 17 * unit, 11 * unit, 3 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 12 * unit, 12 * unit, 3 * unit, 1 * unit, "#302726");
      fillRect(sctx, 17 * unit, 12 * unit, 3 * unit, 1 * unit, "#302726");
    } else if (eyeStyle === "微笑眼") {
      fillRect(sctx, 12 * unit, 11 * unit, 2 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 11 * unit, 12 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 14 * unit, 12 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 18 * unit, 11 * unit, 2 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 17 * unit, 12 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 20 * unit, 12 * unit, 1 * unit, 1 * unit, eyeColor);
    } else if (eyeStyle === "困眼") {
      fillRect(sctx, 12 * unit, 10 * unit, 3 * unit, 1 * unit, "#302726");
      fillRect(sctx, 17 * unit, 10 * unit, 3 * unit, 1 * unit, "#302726");
      fillRect(sctx, 13 * unit, 11 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 18 * unit, 11 * unit, 1 * unit, 1 * unit, eyeColor);
    } else if (eyeStyle === "星星眼") {
      fillRect(sctx, 12 * unit, 10 * unit, 3 * unit, 3 * unit, "#f8f8fb");
      fillRect(sctx, 17 * unit, 10 * unit, 3 * unit, 3 * unit, "#f8f8fb");
      fillRect(sctx, 13 * unit, 11 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 18 * unit, 11 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 12 * unit, 11 * unit, 1 * unit, 1 * unit, "#fff0b5");
      fillRect(sctx, 14 * unit, 11 * unit, 1 * unit, 1 * unit, "#fff0b5");
      fillRect(sctx, 13 * unit, 10 * unit, 1 * unit, 1 * unit, "#fff0b5");
      fillRect(sctx, 13 * unit, 12 * unit, 1 * unit, 1 * unit, "#fff0b5");
      fillRect(sctx, 17 * unit, 11 * unit, 1 * unit, 1 * unit, "#fff0b5");
      fillRect(sctx, 19 * unit, 11 * unit, 1 * unit, 1 * unit, "#fff0b5");
      fillRect(sctx, 18 * unit, 10 * unit, 1 * unit, 1 * unit, "#fff0b5");
      fillRect(sctx, 18 * unit, 12 * unit, 1 * unit, 1 * unit, "#fff0b5");
    } else if (eyeStyle === "泪眼") {
      fillRect(sctx, 12 * unit, 10 * unit, 3 * unit, 3 * unit, "#f8f8fb");
      fillRect(sctx, 17 * unit, 10 * unit, 3 * unit, 3 * unit, "#f8f8fb");
      fillRect(sctx, 13 * unit, 11 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 18 * unit, 11 * unit, 1 * unit, 1 * unit, eyeColor);
      fillRect(sctx, 12 * unit, 13 * unit, 1 * unit, 2 * unit, "#8ec6ff");
      fillRect(sctx, 19 * unit, 13 * unit, 1 * unit, 2 * unit, "#8ec6ff");
      fillRect(sctx, 12 * unit, 12 * unit, 1 * unit, 1 * unit, "#bfe3ff");
      fillRect(sctx, 19 * unit, 12 * unit, 1 * unit, 1 * unit, "#bfe3ff");
    } else {
      fillRect(sctx, 12 * unit, 10 * unit, 3 * unit, 2 * unit, "#fbfbfd");
      fillRect(sctx, 17 * unit, 10 * unit, 3 * unit, 2 * unit, "#fbfbfd");
      fillRect(sctx, 13 * unit, 10 * unit, 1 * unit, 2 * unit, eyeColor);
      fillRect(sctx, 18 * unit, 10 * unit, 1 * unit, 2 * unit, eyeColor);
    }

    if (acc.includes("像素护目镜")) {
      fillRect(sctx, 11 * unit, 10 * unit, 10 * unit, 3 * unit, "#2f2724");
      fillRect(sctx, 12 * unit, 10 * unit, 3 * unit, 3 * unit, "#9fc9f4");
      fillRect(sctx, 17 * unit, 10 * unit, 3 * unit, 3 * unit, "#9fc9f4");
    }

    var _mouth = parseMouthStyle(mouthStyle);
    if (_mouth.shape === "樱桃小嘴" && _mouth.color) {
      fillRect(sctx, 15 * unit, 14 * unit, 2 * unit, 1 * unit, _mouth.color);
    } else if (_mouth.shape === "小O嘴" && _mouth.color) {
      fillRect(sctx, 15 * unit, 14 * unit, 2 * unit, 2 * unit, _mouth.color);
    } else if (_mouth.shape === "微笑" && _mouth.color) {
      fillRect(sctx, 14 * unit, 14 * unit, 1 * unit, 1 * unit, _mouth.color);
      fillRect(sctx, 15 * unit, 15 * unit, 2 * unit, 1 * unit, _mouth.color);
      fillRect(sctx, 17 * unit, 14 * unit, 1 * unit, 1 * unit, _mouth.color);
    } else if (_mouth.shape === "平口" && _mouth.color) {
      fillRect(sctx, 14 * unit, 14 * unit, 4 * unit, 1 * unit, _mouth.color);
    }
    fillRect(sctx, 8 * unit, 16 * unit, 4 * unit, 10 * unit, topColor);
    fillRect(sctx, 20 * unit, 16 * unit, 4 * unit, 10 * unit, topShade);
    fillRect(sctx, 12 * unit, 16 * unit, 8 * unit, 10 * unit, topColor);
    fillRect(sctx, 12 * unit, 16 * unit, 2 * unit, 10 * unit, topLight);
    fillRect(sctx, 18 * unit, 16 * unit, 2 * unit, 10 * unit, topShade);
    fillRect(sctx, 9 * unit, 24 * unit, 2 * unit, 2 * unit, skin);
    fillRect(sctx, 21 * unit, 24 * unit, 2 * unit, 2 * unit, skinShade);

    if (appearance.topStyle === "冒险外套") {
      fillRect(sctx, 12 * unit, 16 * unit, 8 * unit, 2 * unit, topShade);
      fillRect(sctx, 14 * unit, 18 * unit, 4 * unit, 8 * unit, tint(topColor, -34));
      fillRect(sctx, 8 * unit, 16 * unit, 4 * unit, 2 * unit, topShade);
      fillRect(sctx, 20 * unit, 16 * unit, 4 * unit, 2 * unit, topShade);
    } else if (appearance.topStyle === "骑士束衣") {
      fillRect(sctx, 13 * unit, 16 * unit, 6 * unit, 9 * unit, "#f0e7d4");
      fillRect(sctx, 14 * unit, 19 * unit, 4 * unit, 2 * unit, "#8e5a43");
      fillRect(sctx, 8 * unit, 18 * unit, 4 * unit, 2 * unit, topLight);
      fillRect(sctx, 20 * unit, 18 * unit, 4 * unit, 2 * unit, topShade);
    } else if (appearance.topStyle === "铁甲") {
      fillRect(sctx, 8 * unit, 16 * unit, 4 * unit, 3 * unit, "#a8b3c2");
      fillRect(sctx, 20 * unit, 16 * unit, 4 * unit, 3 * unit, "#7a8596");
      fillRect(sctx, 12 * unit, 16 * unit, 8 * unit, 10 * unit, "#b9c3cf");
      fillRect(sctx, 13 * unit, 17 * unit, 6 * unit, 7 * unit, "#d8dee6");
      fillRect(sctx, 14 * unit, 18 * unit, 4 * unit, 2 * unit, topColor);
      fillRect(sctx, 12 * unit, 24 * unit, 8 * unit, 2 * unit, "#7a8596");
    } else if (appearance.topStyle === "皮甲") {
      fillRect(sctx, 12 * unit, 16 * unit, 8 * unit, 10 * unit, topColor);
      fillRect(sctx, 13 * unit, 17 * unit, 6 * unit, 8 * unit, tint(topColor, -18));
      fillRect(sctx, 8 * unit, 17 * unit, 4 * unit, 9 * unit, "#9a6a3a");
      fillRect(sctx, 20 * unit, 17 * unit, 4 * unit, 9 * unit, "#7d4f2a");
      fillRect(sctx, 13 * unit, 20 * unit, 6 * unit, 1 * unit, "#d0a06c");
      fillRect(sctx, 15 * unit, 16 * unit, 1 * unit, 10 * unit, "#70411f");
    } else if (appearance.topStyle === "小斗篷") {
      const capeInner = tint(topColor, 48);
      fillRect(sctx, 8 * unit, 16 * unit, 16 * unit, 3 * unit, topShade);
      fillRect(sctx, 9 * unit, 18 * unit, 5 * unit, 6 * unit, topColor);
      fillRect(sctx, 18 * unit, 18 * unit, 5 * unit, 6 * unit, topShade);
      fillRect(sctx, 12 * unit, 16 * unit, 8 * unit, 10 * unit, tint(topColor, 6));
      // 内部浅色梯形，左右完全对称：每行左边一块、中间（若有）、右边一块，左右等宽
      fillRect(sctx, 15 * unit, 18 * unit, 1 * unit, 1 * unit, capeInner);
      fillRect(sctx, 16 * unit, 18 * unit, 1 * unit, 1 * unit, capeInner);
      fillRect(sctx, 14 * unit, 19 * unit, 1 * unit, 1 * unit, capeInner);
      fillRect(sctx, 15 * unit, 19 * unit, 1 * unit, 1 * unit, capeInner);
      fillRect(sctx, 16 * unit, 19 * unit, 1 * unit, 1 * unit, capeInner);
      fillRect(sctx, 14 * unit, 20 * unit, 2 * unit, 1 * unit, capeInner);
      fillRect(sctx, 16 * unit, 20 * unit, 2 * unit, 1 * unit, capeInner);
      fillRect(sctx, 13 * unit, 21 * unit, 2 * unit, 1 * unit, capeInner);
      fillRect(sctx, 15 * unit, 21 * unit, 1 * unit, 1 * unit, capeInner);
      fillRect(sctx, 16 * unit, 21 * unit, 2 * unit, 1 * unit, capeInner);
      fillRect(sctx, 13 * unit, 22 * unit, 3 * unit, 3 * unit, capeInner);
      fillRect(sctx, 16 * unit, 22 * unit, 3 * unit, 3 * unit, capeInner);
      fillRect(sctx, 13 * unit, 24 * unit, 6 * unit, 2 * unit, topShade);
    } else if (appearance.topStyle === "露肩装") {
      fillRect(sctx, 12 * unit, 16 * unit, 8 * unit, 10 * unit, "#efe7d8");
      fillRect(sctx, 13 * unit, 17 * unit, 6 * unit, 7 * unit, topColor);
      fillRect(sctx, 14 * unit, 18 * unit, 4 * unit, 4 * unit, tint(topColor, -22));
      fillRect(sctx, 8 * unit, 16 * unit, 4 * unit, 4 * unit, skin);
      fillRect(sctx, 20 * unit, 16 * unit, 4 * unit, 4 * unit, skinShade);
      fillRect(sctx, 13 * unit, 24 * unit, 6 * unit, 2 * unit, tint(topColor, -12));
    } else if (appearance.topStyle === "短袖") {
      const topDark = tint(topColor, -36);
      fillRect(sctx, 8 * unit, 16 * unit, 4 * unit, 5 * unit, topColor);
      fillRect(sctx, 9 * unit, 16 * unit, 2 * unit, 5 * unit, topLight);
      fillRect(sctx, 20 * unit, 16 * unit, 4 * unit, 5 * unit, topShade);
      fillRect(sctx, 20 * unit, 16 * unit, 2 * unit, 5 * unit, topDark);
      fillRect(sctx, 8 * unit, 21 * unit, 4 * unit, 5 * unit, skin);
      fillRect(sctx, 20 * unit, 21 * unit, 4 * unit, 5 * unit, skinShade);
      fillRect(sctx, 12 * unit, 16 * unit, 2 * unit, 10 * unit, topLight);
      fillRect(sctx, 13 * unit, 18 * unit, 1 * unit, 7 * unit, topLight);
      fillRect(sctx, 14 * unit, 16 * unit, 4 * unit, 2 * unit, skin);
      fillRect(sctx, 14 * unit, 18 * unit, 4 * unit, 8 * unit, topColor);
      fillRect(sctx, 15 * unit, 20 * unit, 2 * unit, 4 * unit, topDark);
      fillRect(sctx, 18 * unit, 16 * unit, 2 * unit, 10 * unit, topShade);
    } else if (appearance.topStyle === "背心") {
      const topDark = tint(topColor, -28);
      fillRect(sctx, 8 * unit, 16 * unit, 4 * unit, 10 * unit, skin);
      fillRect(sctx, 20 * unit, 16 * unit, 4 * unit, 10 * unit, skinShade);
      fillRect(sctx, 12 * unit, 16 * unit, 8 * unit, 9 * unit, topColor);
      fillRect(sctx, 12 * unit, 16 * unit, 2 * unit, 9 * unit, topLight);
      fillRect(sctx, 18 * unit, 16 * unit, 2 * unit, 9 * unit, topShade);
      fillRect(sctx, 14 * unit, 19 * unit, 4 * unit, 3 * unit, topDark);
      fillRect(sctx, 13 * unit, 25 * unit, 6 * unit, 1 * unit, skin);
      fillRect(sctx, 14 * unit, 25 * unit, 4 * unit, 1 * unit, skinShade);
    } else if (appearance.topStyle === "一字肩") {
      const topDark = tint(topColor, -32);
      // 露肤区：锁骨与肩膀两侧都露，上边缘平的一字
      fillRect(sctx, 8 * unit, 16 * unit, 4 * unit, 2 * unit, skin);
      fillRect(sctx, 9 * unit, 16 * unit, 2 * unit, 2 * unit, skinLight);
      fillRect(sctx, 12 * unit, 16 * unit, 8 * unit, 2 * unit, skin);
      fillRect(sctx, 12 * unit, 16 * unit, 2 * unit, 2 * unit, skinLight);
      fillRect(sctx, 18 * unit, 16 * unit, 2 * unit, 2 * unit, skinShade);
      fillRect(sctx, 20 * unit, 16 * unit, 4 * unit, 2 * unit, skinShade);
      // 衣服从 y=18 起平切，袖与身同一条上边
      fillRect(sctx, 8 * unit, 18 * unit, 4 * unit, 8 * unit, topColor);
      fillRect(sctx, 9 * unit, 18 * unit, 2 * unit, 8 * unit, topLight);
      fillRect(sctx, 20 * unit, 18 * unit, 4 * unit, 8 * unit, topShade);
      fillRect(sctx, 20 * unit, 18 * unit, 2 * unit, 8 * unit, topDark);
      fillRect(sctx, 12 * unit, 18 * unit, 8 * unit, 8 * unit, topColor);
      fillRect(sctx, 12 * unit, 18 * unit, 2 * unit, 8 * unit, topLight);
      fillRect(sctx, 14 * unit, 20 * unit, 4 * unit, 3 * unit, topDark);
      fillRect(sctx, 18 * unit, 18 * unit, 2 * unit, 8 * unit, topShade);
    } else {
      fillRect(sctx, 12 * unit, 23 * unit, 8 * unit, 3 * unit, topShade);
    }
    if (acc.includes("围巾") || acc.includes("奶油围巾") || acc.includes("秋日围巾")) {
      let base = "#d74f4f";
      let light = "#f08d8d";
      let dark = "#9f2f2f";
      if (acc.includes("奶油围巾")) {
        base = "#e8d8b8";
        light = "#f7f0d8";
        dark = "#c6b28c";
      } else if (acc.includes("秋日围巾")) {
        base = "#c28a4a";
        light = "#e0b57a";
        dark = "#8a5b2c";
      }
      fillRect(sctx, 11 * unit, 17 * unit, 10 * unit, 2 * unit, base);
      fillRect(sctx, 11 * unit, 17 * unit, 2 * unit, 2 * unit, light);
      fillRect(sctx, 19 * unit, 17 * unit, 2 * unit, 2 * unit, dark);
      fillRect(sctx, 16 * unit, 19 * unit, 3 * unit, 7 * unit, base);
      fillRect(sctx, 18 * unit, 19 * unit, 1 * unit, 7 * unit, dark);
      fillRect(sctx, 16 * unit, 25 * unit, 3 * unit, 1 * unit, light);
    }


    fillRect(sctx, 12 * unit, 26 * unit, 4 * unit, 5 * unit, bottomColor);
    fillRect(sctx, 16 * unit, 26 * unit, 4 * unit, 5 * unit, bottomShade);
    fillRect(sctx, 12 * unit, 26 * unit, 1 * unit, 5 * unit, bottomLight);
    fillRect(sctx, 19 * unit, 26 * unit, 1 * unit, 5 * unit, bottomShade);

    if (appearance.bottomStyle === "旅行短裤") {
      fillRect(sctx, 12 * unit, 26 * unit, 8 * unit, 1 * unit, bottomColor);
      fillRect(sctx, 12 * unit, 27 * unit, 8 * unit, 1 * unit, bottomShade);
      fillRect(sctx, 12 * unit, 28 * unit, 4 * unit, 4 * unit, skin);
      fillRect(sctx, 16 * unit, 28 * unit, 4 * unit, 4 * unit, skinShade);
      fillRect(sctx, 12 * unit, 28 * unit, 1 * unit, 4 * unit, skinLight);
    } else if (appearance.bottomStyle === "山路工装") {
      fillRect(sctx, 12 * unit, 26 * unit, 8 * unit, 5 * unit, bottomColor);
      // 腰带最上排收窄 1px（去掉左右各多出的 1 格）
      fillRect(sctx, 12 * unit, 25 * unit, 8 * unit, 1 * unit, "#b8956e");
      fillRect(sctx, 15 * unit, 25 * unit, 2 * unit, 1 * unit, "#4a3728");
      fillRect(sctx, 13 * unit, 28 * unit, 2 * unit, 2 * unit, bottomLight);
      fillRect(sctx, 17 * unit, 28 * unit, 2 * unit, 2 * unit, bottomShade);
    } else if (appearance.bottomStyle === "长裙") {
      fillRect(sctx, 11 * unit, 26 * unit, 10 * unit, 5 * unit, bottomColor);
      fillRect(sctx, 11 * unit, 30 * unit, 10 * unit, 1 * unit, bottomShade);
      fillRect(sctx, 13 * unit, 27 * unit, 1 * unit, 3 * unit, bottomLight);
      fillRect(sctx, 16 * unit, 27 * unit, 1 * unit, 3 * unit, bottomLight);
      fillRect(sctx, 19 * unit, 27 * unit, 1 * unit, 3 * unit, bottomShade);
    } else if (appearance.bottomStyle === "短裙") {
      fillRect(sctx, 11 * unit, 26 * unit, 10 * unit, 3 * unit, bottomColor);
      fillRect(sctx, 11 * unit, 28 * unit, 2 * unit, 1 * unit, bottomShade);
      fillRect(sctx, 13 * unit, 27 * unit, 2 * unit, 2 * unit, bottomShade);
      fillRect(sctx, 15 * unit, 28 * unit, 2 * unit, 1 * unit, bottomShade);
      fillRect(sctx, 17 * unit, 27 * unit, 2 * unit, 2 * unit, bottomShade);
      fillRect(sctx, 19 * unit, 28 * unit, 2 * unit, 1 * unit, bottomShade);
      fillRect(sctx, 12 * unit, 27 * unit, 1 * unit, 2 * unit, bottomLight);
      fillRect(sctx, 14 * unit, 27 * unit, 1 * unit, 2 * unit, tint(bottomColor, 6));
      fillRect(sctx, 16 * unit, 27 * unit, 1 * unit, 2 * unit, bottomLight);
      fillRect(sctx, 18 * unit, 27 * unit, 1 * unit, 2 * unit, tint(bottomShade, 6));
      fillRect(sctx, 12 * unit, 29 * unit, 4 * unit, 3 * unit, skin);
      fillRect(sctx, 16 * unit, 29 * unit, 4 * unit, 3 * unit, skinShade);
      fillRect(sctx, 12 * unit, 29 * unit, 1 * unit, 3 * unit, skinLight);
    } else if (appearance.bottomStyle === "轻甲护腿") {
      fillRect(sctx, 12 * unit, 26 * unit, 8 * unit, 5 * unit, bottomColor);
      fillRect(sctx, 12 * unit, 28 * unit, 4 * unit, 3 * unit, "#c7ced7");
      fillRect(sctx, 16 * unit, 28 * unit, 4 * unit, 3 * unit, "#8d97a6");
      fillRect(sctx, 13 * unit, 29 * unit, 2 * unit, 1 * unit, "#eef2f5");
      fillRect(sctx, 17 * unit, 29 * unit, 2 * unit, 1 * unit, "#b2bcc9");
    }
    if (hairStyle === "双麻花辫") {
      fillRect(sctx, 10 * unit, 16 * unit, 2 * unit, 9 * unit, hairLight);
      fillRect(sctx, 20 * unit, 16 * unit, 2 * unit, 9 * unit, hairShade);
      fillRect(sctx, 10 * unit, 18 * unit, 2 * unit, 1 * unit, hair);
      fillRect(sctx, 20 * unit, 18 * unit, 2 * unit, 1 * unit, hair);
      fillRect(sctx, 10 * unit, 21 * unit, 2 * unit, 1 * unit, hair);
      fillRect(sctx, 20 * unit, 21 * unit, 2 * unit, 1 * unit, hair);
      fillRect(sctx, 9 * unit, 16 * unit, 1 * unit, 4 * unit, hairLight);
      fillRect(sctx, 22 * unit, 16 * unit, 1 * unit, 4 * unit, hairShade);
    } else if (hairStyle === "侧麻花辫") {
      fillRect(sctx, 10 * unit, 16 * unit, 2 * unit, 9 * unit, hairLight);
      fillRect(sctx, 10 * unit, 18 * unit, 2 * unit, 1 * unit, hair);
      fillRect(sctx, 10 * unit, 21 * unit, 2 * unit, 1 * unit, hair);
      fillRect(sctx, 9 * unit, 16 * unit, 1 * unit, 4 * unit, hairLight);
    }
    fillRect(sctx, 12 * unit, 31 * unit, 4 * unit, 1 * unit, shoeColor);
    fillRect(sctx, 16 * unit, 31 * unit, 4 * unit, 1 * unit, shoeColor);
    fillRect(sctx, 12 * unit, 30 * unit, 4 * unit, 1 * unit, shoeLight);
    fillRect(sctx, 16 * unit, 30 * unit, 4 * unit, 1 * unit, shoeLight);

    const __prevWeapon = appearance.weapon;
    let __leftWeapon = appearance.weaponLeft || (isShieldWeaponValue(__prevWeapon) ? __prevWeapon : "无");
    let __rightWeapon = appearance.weaponRight || (!isShieldWeaponValue(__prevWeapon) && __prevWeapon && __prevWeapon !== "无" ? __prevWeapon : "无");
    if (isShieldWeaponValue(__rightWeapon)) {
      __leftWeapon = __rightWeapon;
      __rightWeapon = "无";
    }
    appearance.weapon = __rightWeapon;

    if (!appearance.weapon || appearance.weapon === "无") {
      // 空手：不绘制装备
    } else if (appearance.weapon === "铁剑") {
      fillRect(sctx, 23 * unit, 24 * unit, 2 * unit, 5 * unit, "#7f5c31");
      fillRect(sctx, 23 * unit, 29 * unit, 2 * unit, 1 * unit, "#555861");
      fillRect(sctx, 22 * unit, 23 * unit, 4 * unit, 1 * unit, "#3b3f48");
      fillRect(sctx, 21 * unit, 22 * unit, 6 * unit, 1 * unit, "#6b7280");
      fillRect(sctx, 22 * unit, 21 * unit, 4 * unit, 1 * unit, "#a9b0ba");
      fillRect(sctx, 23 * unit, 16 * unit, 2 * unit, 5 * unit, "#d4dae2");
      fillRect(sctx, 24 * unit, 16 * unit, 1 * unit, 5 * unit, "#eef2f6");
      fillRect(sctx, 23 * unit, 15 * unit, 2 * unit, 1 * unit, "#c4cbd4");
      fillRect(sctx, 24 * unit, 14 * unit, 1 * unit, 1 * unit, "#f8fbff");
    } else if (appearance.weapon === "弓箭") {
      fillRect(sctx, 24 * unit, 15 * unit, 1 * unit, 13 * unit, "#8a5d34");
      fillRect(sctx, 23 * unit, 14 * unit, 1 * unit, 2 * unit, "#a97a47");
      fillRect(sctx, 22 * unit, 13 * unit, 1 * unit, 2 * unit, "#6f4726");
      fillRect(sctx, 23 * unit, 26 * unit, 1 * unit, 2 * unit, "#a97a47");
      fillRect(sctx, 22 * unit, 27 * unit, 1 * unit, 2 * unit, "#6f4726");
      fillRect(sctx, 21 * unit, 13 * unit, 1 * unit, 16 * unit, "#f1eee7");
      fillRect(sctx, 20 * unit, 18 * unit, 1 * unit, 6 * unit, "#86603a");
      fillRect(sctx, 19 * unit, 17 * unit, 1 * unit, 1 * unit, "#dde4ea");
      fillRect(sctx, 19 * unit, 24 * unit, 1 * unit, 1 * unit, "#dde4ea");
      fillRect(sctx, 18 * unit, 17 * unit, 1 * unit, 8 * unit, "#ba8d54");
      fillRect(sctx, 17 * unit, 17 * unit, 1 * unit, 1 * unit, "#d14e4b");
    } else if (appearance.weapon === "红宝石魔杖") {
      fillRect(sctx, 23 * unit, 17 * unit, 2 * unit, 11 * unit, "#8f5d3a");
      fillRect(sctx, 24 * unit, 16 * unit, 1 * unit, 1 * unit, "#b67b53");
      fillRect(sctx, 22 * unit, 15 * unit, 4 * unit, 2 * unit, "#6f3935");
      fillRect(sctx, 23 * unit, 14 * unit, 2 * unit, 1 * unit, "#c93e34");
      fillRect(sctx, 23 * unit, 15 * unit, 1 * unit, 1 * unit, "#ff9a73");
      fillRect(sctx, 24 * unit, 15 * unit, 1 * unit, 1 * unit, "#8b191e");
    } else if (appearance.weapon === "绿宝石魔杖") {
      fillRect(sctx, 23 * unit, 17 * unit, 2 * unit, 11 * unit, "#8b5d39");
      fillRect(sctx, 24 * unit, 16 * unit, 1 * unit, 1 * unit, "#b5794f");
      fillRect(sctx, 22 * unit, 15 * unit, 4 * unit, 2 * unit, "#5d7a35");
      fillRect(sctx, 23 * unit, 14 * unit, 2 * unit, 1 * unit, "#40b861");
      fillRect(sctx, 23 * unit, 15 * unit, 1 * unit, 1 * unit, "#94ea9f");
      fillRect(sctx, 24 * unit, 15 * unit, 1 * unit, 1 * unit, "#277d43");
    } else if (appearance.weapon === "紫水晶魔杖") {
      fillRect(sctx, 23 * unit, 17 * unit, 2 * unit, 11 * unit, "#956341");
      fillRect(sctx, 24 * unit, 16 * unit, 1 * unit, 1 * unit, "#bc8158");
      fillRect(sctx, 22 * unit, 15 * unit, 4 * unit, 2 * unit, "#6e4f8d");
      fillRect(sctx, 23 * unit, 14 * unit, 2 * unit, 1 * unit, "#a56cf0");
      fillRect(sctx, 23 * unit, 15 * unit, 1 * unit, 1 * unit, "#e3bcff");
      fillRect(sctx, 24 * unit, 15 * unit, 1 * unit, 1 * unit, "#5d30a2");
    } else if (appearance.weapon === "水晶法杖") {
      fillRect(sctx, 23 * unit, 17 * unit, 2 * unit, 11 * unit, "#93653c");
      fillRect(sctx, 22 * unit, 15 * unit, 4 * unit, 3 * unit, "#eef2ff");
      fillRect(sctx, 23 * unit, 14 * unit, 2 * unit, 1 * unit, "#c9d9ff");
    } else if (appearance.weapon === "像素长枪") {
      fillRect(sctx, 24 * unit, 12 * unit, 1 * unit, 16 * unit, "#b88a52");
      fillRect(sctx, 22 * unit, 11 * unit, 5 * unit, 2 * unit, "#d8dde4");
    } else if (appearance.weapon === "三叉戟" || appearance.weapon === "黄金三叉戟" || appearance.weapon === "白银三叉戟") {
      let shaft;
      let shaftShade;
      let head;
      let headShade;
      if (appearance.weapon === "三叉戟") {
        shaft = "#1b8c86";
        shaftShade = "#13615e";
        head = "#f5f7fb";
        headShade = "#d5dde6";
      } else if (appearance.weapon === "黄金三叉戟") {
        shaft = "#d0a640";
        shaftShade = "#9b7a24";
        head = "#ffe9a6";
        headShade = "#f3c96a";
      } else {
        // 白银三叉戟：通体银白
        shaft = "#c7ccd8";
        shaftShade = "#9ba1b0";
        head = "#f6f8ff";
        headShade = "#dde3f2";
      }
      // 手柄：竖直向上
      fillRect(sctx, 24 * unit, 14 * unit, 1 * unit, 14 * unit, shaft);
      fillRect(sctx, 25 * unit, 14 * unit, 1 * unit, 14 * unit, shaftShade);
      // 手柄与叉头连接
      fillRect(sctx, 23 * unit, 13 * unit, 3 * unit, 1 * unit, shaftShade);
      // 中央叉齿
      fillRect(sctx, 24 * unit, 9 * unit, 1 * unit, 4 * unit, head);
      fillRect(sctx, 24 * unit, 8 * unit, 1 * unit, 1 * unit, headShade);
      // 左侧叉齿
      fillRect(sctx, 22 * unit, 10 * unit, 1 * unit, 3 * unit, head);
      fillRect(sctx, 22 * unit, 9 * unit, 1 * unit, 1 * unit, headShade);
      // 右侧叉齿
      fillRect(sctx, 26 * unit, 10 * unit, 1 * unit, 3 * unit, head);
      fillRect(sctx, 26 * unit, 9 * unit, 1 * unit, 1 * unit, headShade);
      // 叉头横梁
      fillRect(sctx, 22 * unit, 12 * unit, 5 * unit, 1 * unit, head);
    } else if (appearance.weapon === "魔导书" || appearance.weapon === "羊皮书" || appearance.weapon === "小红书") {
      let bookCover = "#6b58d8";
      if (appearance.weapon === "羊皮书") bookCover = "#b9915a";
      else if (appearance.weapon === "小红书") bookCover = "#c94a4a";
      fillRect(sctx, 22 * unit, 18 * unit, 4 * unit, 6 * unit, bookCover);
      fillRect(sctx, 23 * unit, 19 * unit, 2 * unit, 4 * unit, "#fff3cb");
    } else if (appearance.weapon === "铁盾" || appearance.weapon === "盾牌") {
      // 左手圆盾：木边 + 铁皮 + 中心铆钉
      fillRect(sctx, 4 * unit, 17 * unit, 7 * unit, 10 * unit, "#5c4a38");
      fillRect(sctx, 5 * unit, 18 * unit, 5 * unit, 8 * unit, "#7a8a9e");
      fillRect(sctx, 6 * unit, 19 * unit, 3 * unit, 6 * unit, "#9aaab8");
      fillRect(sctx, 5 * unit, 18 * unit, 1 * unit, 8 * unit, "#d0dae4");
      fillRect(sctx, 7 * unit, 21 * unit, 2 * unit, 2 * unit, "#c9a227");
      fillRect(sctx, 10 * unit, 21 * unit, 2 * unit, 3 * unit, "#6b5344");
    } else if (appearance.weapon === "木盾") {
      // 造型一致，仅改为木盾配色
      fillRect(sctx, 4 * unit, 17 * unit, 7 * unit, 10 * unit, "#6f4f33");
      fillRect(sctx, 5 * unit, 18 * unit, 5 * unit, 8 * unit, "#9a6a3f");
      fillRect(sctx, 6 * unit, 19 * unit, 3 * unit, 6 * unit, "#b9824f");
      fillRect(sctx, 5 * unit, 18 * unit, 1 * unit, 8 * unit, "#ddb485");
      fillRect(sctx, 7 * unit, 21 * unit, 2 * unit, 2 * unit, "#7b5a3b");
      fillRect(sctx, 10 * unit, 21 * unit, 2 * unit, 3 * unit, "#5a3f2b");
    } else if (appearance.weapon === "斧头") {
      // 柄（加长，与斧头上缘对齐）
      fillRect(sctx, 24 * unit, 10 * unit, 2 * unit, 18 * unit, "#6b4a2f");
      fillRect(sctx, 25 * unit, 10 * unit, 1 * unit, 18 * unit, "#4a3320");
      // 斧刃主体
      fillRect(sctx, 19 * unit, 11 * unit, 6 * unit, 8 * unit, "#6d6d6d");
      fillRect(sctx, 19 * unit, 11 * unit, 1 * unit, 8 * unit, "#d0d0d0");
      fillRect(sctx, 20 * unit, 12 * unit, 4 * unit, 6 * unit, "#a8a8a8");
      // 上下箍住斧头的金属环
      fillRect(sctx, 21 * unit, 10 * unit, 3 * unit, 2 * unit, "#3d3d3d");
      fillRect(sctx, 21 * unit, 18 * unit, 3 * unit, 2 * unit, "#3d3d3d");
      // 锤背（柄右侧配重，与参考图一致）
      fillRect(sctx, 26 * unit, 12 * unit, 2 * unit, 5 * unit, "#4a4a4a");
      fillRect(sctx, 27 * unit, 13 * unit, 1 * unit, 3 * unit, "#3a3a3a");
    } else if (appearance.weapon === "十字架") {
      // 通身木色（竖梁 / 横梁 / 顶端同材，仅深浅区分体积）
      fillRect(sctx, 24 * unit, 14 * unit, 2 * unit, 14 * unit, "#b8925a");
      fillRect(sctx, 25 * unit, 14 * unit, 1 * unit, 14 * unit, "#6b5344");
      fillRect(sctx, 20 * unit, 17 * unit, 10 * unit, 2 * unit, "#a67c52");
      fillRect(sctx, 21 * unit, 18 * unit, 8 * unit, 1 * unit, "#5c4033");
      fillRect(sctx, 24 * unit, 12 * unit, 2 * unit, 3 * unit, "#d4a574");
      fillRect(sctx, 25 * unit, 12 * unit, 1 * unit, 3 * unit, "#8b6914");
    } else if (appearance.weapon === "药水") {
      // 圆底烧瓶：细颈 + 肩宽 + 鼓腹 + 底略收（非直筒）
      const u = unit;
      fillRect(sctx, 22 * u, 19 * u, 4 * u, 2 * u, "#d8eaf2");
      fillRect(sctx, 25 * u, 19 * u, 1 * u, 2 * u, "#9bb8c8");
      fillRect(sctx, 21 * u, 21 * u, 6 * u, 1 * u, "#c8e0ec");
      fillRect(sctx, 20 * u, 22 * u, 8 * u, 1 * u, "#c0dce8");
      fillRect(sctx, 20 * u, 23 * u, 8 * u, 4 * u, "#b0d0e0");
      fillRect(sctx, 21 * u, 27 * u, 6 * u, 1 * u, "#a8ccd8");
      fillRect(sctx, 22 * u, 28 * u, 4 * u, 1 * u, "#94b8c8");
      fillRect(sctx, 23 * u, 20 * u, 2 * u, 1 * u, "#4ade80");
      fillRect(sctx, 22 * u, 21 * u, 4 * u, 1 * u, "#34d399");
      fillRect(sctx, 21 * u, 22 * u, 6 * u, 1 * u, "#22c55e");
      fillRect(sctx, 21 * u, 23 * u, 6 * u, 4 * u, "#16a34a");
      fillRect(sctx, 22 * u, 24 * u, 2 * u, 3 * u, "#86efac");
      fillRect(sctx, 25 * u, 23 * u, 1 * u, 4 * u, "#15803d");
      fillRect(sctx, 22 * u, 19 * u, 1 * u, 2 * u, "#f8fcff");
      fillRect(sctx, 20 * u, 22 * u, 1 * u, 6 * u, "#e8f4fa");
      fillRect(sctx, 21 * u, 21 * u, 1 * u, 1 * u, "#ffffff");
      fillRect(sctx, 27 * u, 22 * u, 1 * u, 6 * u, "#5a7d8e");
      fillRect(sctx, 23 * u, 18 * u, 2 * u, 1 * u, "#5c4033");
      fillRect(sctx, 24 * u, 18 * u, 1 * u, 1 * u, "#3d2a1f");
    } else {
      fillRect(sctx, 23 * unit, 24 * unit, 2 * unit, 5 * unit, "#7b5430");
      fillRect(sctx, 23 * unit, 29 * unit, 2 * unit, 1 * unit, "#5d3d22");
      fillRect(sctx, 22 * unit, 23 * unit, 4 * unit, 1 * unit, "#6b4726");
      fillRect(sctx, 21 * unit, 22 * unit, 6 * unit, 1 * unit, "#8a6238");
      fillRect(sctx, 22 * unit, 21 * unit, 4 * unit, 1 * unit, "#9c6e40");
      fillRect(sctx, 23 * unit, 16 * unit, 2 * unit, 5 * unit, "#b9874d");
      fillRect(sctx, 24 * unit, 16 * unit, 1 * unit, 5 * unit, "#d4a66d");
      fillRect(sctx, 23 * unit, 15 * unit, 2 * unit, 1 * unit, "#a97741");
      fillRect(sctx, 24 * unit, 14 * unit, 1 * unit, 1 * unit, "#e1b87c");
    }
    appearance.weapon = __prevWeapon;
    if (__leftWeapon === "铁盾" || __leftWeapon === "盾牌") {
      fillRect(sctx, 4 * unit, 17 * unit, 7 * unit, 10 * unit, "#5c4a38");
      fillRect(sctx, 5 * unit, 18 * unit, 5 * unit, 8 * unit, "#7a8a9e");
      fillRect(sctx, 6 * unit, 19 * unit, 3 * unit, 6 * unit, "#9aaab8");
      fillRect(sctx, 5 * unit, 18 * unit, 1 * unit, 8 * unit, "#d0dae4");
      fillRect(sctx, 7 * unit, 21 * unit, 2 * unit, 2 * unit, "#c9a227");
      fillRect(sctx, 10 * unit, 21 * unit, 2 * unit, 3 * unit, "#6b5344");
    } else if (__leftWeapon === "木盾") {
      fillRect(sctx, 4 * unit, 17 * unit, 7 * unit, 10 * unit, "#6f4f33");
      fillRect(sctx, 5 * unit, 18 * unit, 5 * unit, 8 * unit, "#9a6a3f");
      fillRect(sctx, 6 * unit, 19 * unit, 3 * unit, 6 * unit, "#b9824f");
      fillRect(sctx, 5 * unit, 18 * unit, 1 * unit, 8 * unit, "#ddb485");
      fillRect(sctx, 7 * unit, 21 * unit, 2 * unit, 2 * unit, "#7b5a3b");
      fillRect(sctx, 10 * unit, 21 * unit, 2 * unit, 3 * unit, "#5a3f2b");
    }
  }

  function getCharacterSprite(appearance, size) {
    return spriteCanvas("hero:" + JSON.stringify(appearance), size || 32, function (sctx, canvasSize) {
      drawCharacterPixels(sctx, appearance, canvasSize);
    });
  }

  function getCharacterSpriteSafe(appearance, size) {
    try {
      return getCharacterSprite(appearance, size);
    } catch (error) {
      console.error("character sprite failed", error);
      return spriteCanvas("hero:fallback:" + (size || 32), size || 32, function (sctx, canvasSize) {
        const unit = canvasSize / 32;
        fillRect(sctx, 0, 0, canvasSize, canvasSize, "#e6dcc3");
        fillRect(sctx, 10 * unit, 7 * unit, 12 * unit, 10 * unit, "#d6b089");
        fillRect(sctx, 9 * unit, 17 * unit, 14 * unit, 9 * unit, "#5aaeb0");
        fillRect(sctx, 11 * unit, 26 * unit, 4 * unit, 5 * unit, "#34529b");
        fillRect(sctx, 17 * unit, 26 * unit, 4 * unit, 5 * unit, "#34529b");
        fillRect(sctx, 13 * unit, 11 * unit, 2 * unit, 2 * unit, "#222222");
        fillRect(sctx, 17 * unit, 11 * unit, 2 * unit, 2 * unit, "#222222");
      });
    }
  }

function drawPetBodyCorePixels(sctx, pet, size) {
    const unit = size / 32;
    const template = PET_SPECIES[pet.species];
    const stage = clamp(Number(pet.stage) || 0, 0, 2);
    function r(x, y, w, h, color) { fillRect(sctx, x * unit, y * unit, w * unit, h * unit, color); }
    function px(x, y, color) { fillRect(sctx, x * unit, y * unit, 1 * unit, 1 * unit, color); }
    function eyes(leftX, y, gap, blink) {
      if (blink) { r(leftX, y, 2, 1, template.eye); r(leftX + gap, y, 2, 1, template.eye); }
      else { px(leftX, y, template.eye); px(leftX + gap, y, template.eye); }
    }
    function chickShape() {
      if (stage === 0) {
        r(11, 17, 7, 5, template.color);
        r(13, 14, 5, 4, template.color);
        r(12, 15, 1, 2, template.shade);
        r(13, 14, 4, 1, template.light);
        r(11, 21, 7, 1, template.shade);
        px(18, 17, template.detail); px(18, 18, template.detail);
        px(10, 18, template.shade); px(12, 22, template.eye); px(16, 22, template.eye);
        px(13, 22, template.detail); px(14, 23, template.shade);
      } else if (stage === 1) {
        r(10, 16, 9, 6, template.color);
        r(13, 12, 6, 5, template.color);
        r(12, 13, 1, 3, template.shade); r(14, 12, 3, 1, template.light);
        r(12, 18, 4, 3, template.light); r(10, 21, 9, 1, template.shade);
        px(19, 16, template.detail); px(20, 17, template.detail); px(20, 18, template.detail);
        r(11, 22, 1, 2, template.shade); r(16, 22, 1, 2, template.shade);
        eyes(15, 16, 2, false); px(17, 18, template.detail);
      } else {
        r(9, 15, 11, 7, template.color);
        r(13, 10, 7, 6, template.color);
        r(12, 11, 1, 4, template.shade); r(15, 10, 3, 1, template.light);
        r(12, 17, 5, 3, template.light); r(9, 21, 11, 1, template.shade);
        r(9, 17, 2, 3, template.shade); r(20, 16, 2, 3, template.detail);
        r(12, 22, 1, 3, template.shade); r(17, 22, 1, 3, template.shade);
        eyes(15, 15, 3, false); px(18, 17, template.detail); px(19, 18, template.detail);
      }
    }
    function slimeShape() {
      if (stage === 0) {
        r(11, 16, 10, 6, template.color); r(12, 15, 8, 1, template.light);
        r(12, 17, 5, 1, template.accent); r(11, 21, 10, 1, template.shade);
        r(12, 22, 2, 2, template.detail); r(18, 22, 2, 2, template.detail);
        eyes(14, 19, 4, false); px(17, 20, template.detail);
      } else if (stage === 1) {
        r(10, 14, 12, 8, template.color); r(11, 13, 10, 1, template.light);
        r(12, 15, 6, 1, template.accent); r(10, 21, 12, 1, template.shade);
        r(11, 22, 2, 2, template.detail); r(19, 22, 2, 2, template.detail);
        eyes(13, 18, 5, false); r(16, 19, 2, 1, template.detail);
      } else {
        r(9, 12, 14, 10, template.color); r(10, 11, 12, 1, template.light);
        r(11, 13, 7, 1, template.accent); r(9, 21, 14, 2, template.shade);
        r(10, 23, 3, 2, template.detail); r(19, 23, 3, 2, template.detail);
        eyes(13, 17, 5, false); r(16, 19, 2, 1, template.detail);
      }
    }
    function foxShape() {
      if (stage === 0) {
        r(11, 17, 8, 4, template.color); r(15, 14, 6, 4, template.color);
        r(16, 12, 1, 2, template.shade); r(19, 12, 1, 2, template.shade);
        r(12, 18, 3, 2, template.detail); r(9, 18, 3, 2, template.accent);
        px(21, 17, template.light); px(22, 18, template.light); r(8, 19, 2, 1, template.detail);
        r(12, 21, 1, 2, template.shade); r(17, 21, 1, 2, template.shade);
        eyes(17, 16, 2, false); px(20, 18, template.detail);
      } else if (stage === 1) {
        r(10, 16, 10, 5, template.color); r(15, 12, 7, 5, template.color);
        r(16, 10, 2, 2, template.shade); r(20, 10, 1, 2, template.shade);
        r(12, 17, 4, 2, template.detail); r(7, 17, 4, 3, template.accent);
        r(6, 18, 2, 2, template.detail); r(20, 15, 2, 1, template.light);
        r(11, 21, 1, 3, template.shade); r(18, 21, 1, 3, template.shade);
        eyes(17, 15, 3, false); px(21, 17, template.detail);
      } else {
        r(9, 15, 12, 6, template.color); r(16, 11, 8, 6, template.color);
        r(17, 9, 2, 2, template.shade); r(22, 9, 1, 2, template.shade);
        r(11, 16, 5, 3, template.detail); r(5, 16, 5, 4, template.accent);
        r(4, 17, 2, 2, template.detail); r(21, 14, 2, 1, template.light); r(8, 20, 2, 1, template.shade);
        r(11, 21, 1, 4, template.shade); r(19, 21, 1, 4, template.shade);
        eyes(18, 14, 3, false); px(22, 17, template.detail);
      }
    }
    function catShape() {
      if (stage === 0) {
        r(11, 17, 8, 4, template.color); r(15, 14, 5, 4, template.color);
        r(15, 12, 1, 2, template.detail); r(18, 12, 1, 2, template.detail);
        r(12, 18, 3, 2, template.light);
        // 幼年尾巴：形状与少年一致（横-竖-横），位置右移以连接幼年身体
        px(10, 18, template.detail);
        px(9, 18, template.detail);
        r(9, 14, 1, 4, template.detail);
        r(7, 14, 3, 1, template.detail);
        r(11, 21, 1, 2, template.shade); r(17, 21, 1, 2, template.shade);
        eyes(16, 16, 2, false); px(18, 18, template.detail);
      } else if (stage === 1) {
        r(10, 16, 10, 5, template.color); r(15, 12, 6, 5, template.color);
        r(15, 10, 2, 2, template.detail); r(19, 10, 1, 2, template.detail);
        r(12, 17, 4, 2, template.light);
        // 少年尾巴：按参考图的“横-竖-横”，且颜色与耳朵一致（template.detail）
        // 连接点（与米色身体相连）：从身体左侧伸出
        px(9, 18, template.detail);
        // 横（靠身体这一段，向左）
        px(8, 18, template.detail);
        // 竖（向上）
        r(8, 14, 1, 4, template.detail);
        // 顶部再横一段（向左，而不是向右）
        r(6, 14, 3, 1, template.detail);
        r(10, 21, 1, 3, template.shade); r(18, 21, 1, 3, template.shade); r(16, 14, 1, 2, template.shade);
        eyes(17, 15, 2, false); px(19, 17, template.detail);
      } else {
        r(9, 15, 12, 6, template.color); r(15, 10, 7, 6, template.color);
        r(15, 8, 2, 2, template.detail); r(20, 8, 1, 2, template.detail);
        r(11, 16, 5, 2, template.light);
        // 尾巴：与少年阶段一致的“横-竖-横”，且颜色与耳朵一致（template.detail）
        px(8, 18, template.detail);
        px(7, 18, template.detail);
        r(7, 14, 1, 4, template.detail);
        r(5, 14, 3, 1, template.detail);
        r(9, 21, 12, 1, template.shade); r(10, 21, 1, 3, template.shade); r(19, 21, 1, 3, template.shade);
        // 去掉脸部两块浅棕色阴影
        // 成年眼睛更大：两个 1x2（无高光）
        r(16, 12, 1, 2, template.eye);
        r(19, 12, 1, 2, template.eye);
        px(20, 17, template.detail);
      }
    }

    function alarmBeastShape() {
      // 更像“拖延巨兽”的小型可爱版：圆润身体 + 小角 + 表盘点缀
      if (stage === 0) {
        r(11, 16, 10, 6, template.color);
        r(13, 14, 6, 3, template.color);
        r(12, 15, 1, 2, template.shade);
        r(11, 21, 10, 1, template.shade);
        // 小角
        px(13, 13, template.accent); px(18, 13, template.accent);
        // 表盘小圆点（像闹钟）
        px(15, 18, template.detail); px(16, 18, template.detail);
        eyes(14, 19, 4, false);
        px(16, 20, template.detail);
      } else if (stage === 1) {
        r(10, 14, 12, 8, template.color);
        r(12, 12, 8, 3, template.color);
        r(11, 14, 1, 5, template.shade);
        r(10, 21, 12, 1, template.shade);
        // 更明显的角
        r(12, 11, 2, 2, template.accent); r(18, 11, 2, 2, template.accent);
        // 表盘
        r(14, 16, 4, 4, template.light);
        px(15, 17, template.detail); px(16, 18, template.detail); px(17, 17, template.detail);
        eyes(13, 18, 5, false);
      } else {
        r(9, 12, 14, 10, template.color);
        r(11, 10, 10, 3, template.color);
        r(10, 12, 2, 9, template.shade);
        r(9, 21, 14, 2, template.shade);
        // 大角 + 背部装饰
        r(11, 9, 3, 3, template.accent); r(19, 9, 3, 3, template.accent);
        r(13, 13, 7, 2, template.light);
        // 表盘更大
        r(14, 15, 4, 5, template.light);
        r(15, 16, 2, 2, template.detail);
        // 成年：眼睛更大更可爱（2x2）
        r(13, 17, 2, 2, template.eye);
        r(19, 17, 2, 2, template.eye);
      }
    }

    function dayGhostShape() {
      // 更活泼可爱：微笑眼（豆豆眼 + 上方高光）+ 更亮的身体
      if (stage === 0) {
        r(12, 14, 8, 8, template.color);
        r(13, 13, 6, 2, template.light);
        r(12, 20, 8, 2, template.shade);
        // 裙摆波浪
        px(12, 22, template.shade); px(14, 22, template.shade); px(16, 22, template.shade); px(18, 22, template.shade);
        // 微笑眼
        px(15, 17, template.eye); px(17, 17, template.eye);
        px(15, 16, template.light); px(17, 16, template.light);
        px(16, 19, template.detail);
      } else if (stage === 1) {
        r(11, 12, 10, 10, template.color);
        r(12, 11, 8, 2, template.light);
        r(11, 20, 10, 2, template.shade);
        // 更大的波浪裙摆
        px(11, 22, template.shade); px(13, 22, template.shade); px(15, 22, template.shade); px(17, 22, template.shade); px(19, 22, template.shade); px(21, 22, template.shade);
        // 微笑眼
        px(14, 16, template.eye); px(18, 16, template.eye);
        px(14, 15, template.light); px(18, 15, template.light);
        r(15, 18, 2, 1, template.detail);
      } else {
        r(10, 10, 12, 12, template.color);
        r(11, 9, 10, 2, template.light);
        r(10, 20, 12, 3, template.shade);
        // 裙摆
        px(10, 23, template.shade); px(12, 23, template.shade); px(14, 23, template.shade); px(16, 23, template.shade); px(18, 23, template.shade); px(20, 23, template.shade); px(22, 23, template.shade);
        // 微笑眼更萌
        px(14, 15, template.eye); px(19, 15, template.eye);
        px(14, 14, template.light); px(19, 14, template.light);
        r(16, 17, 2, 1, template.detail);
      }
    }

    function tidyCrowShape() {
      // 轮廓接近乌鸦，但做成白色系、干净利落：更对称的翅膀 + 金色点缀
      if (stage === 0) {
        r(12, 16, 8, 6, template.color);
        r(10, 17, 2, 3, template.detail);
        r(20, 17, 2, 3, template.detail);
        r(14, 14, 6, 2, template.light);
        r(12, 21, 8, 1, template.shade);
        // 头 + 喙
        r(17, 13, 4, 3, template.color);
        px(21, 15, template.detail);
        // 眼睛
        px(18, 15, template.eye);
        px(18, 14, template.light);
      } else if (stage === 1) {
        r(11, 15, 10, 7, template.color);
        r(8, 15, 3, 5, template.detail);
        r(21, 15, 3, 5, template.detail);
        r(12, 14, 8, 1, template.light);
        r(11, 21, 10, 1, template.shade);
        // 头
        r(16, 11, 6, 4, template.color);
        r(17, 10, 4, 1, template.light);
        // 喙
        r(22, 13, 2, 1, template.detail);
        // 眼睛
        px(18, 13, template.eye);
        px(18, 12, template.light);
      } else {
        r(10, 14, 12, 8, template.color);
        r(6, 14, 4, 7, template.detail);
        r(22, 14, 4, 7, template.detail);
        r(11, 13, 10, 1, template.light);
        r(10, 21, 12, 2, template.shade);
        // 头更大
        r(15, 10, 8, 5, template.color);
        r(16, 9, 6, 1, template.light);
        // 喙（上移，避免与下方翅膀/身体重合）
        r(23, 11, 2, 2, template.detail);
        // 眼睛更大（2x2），内部用深浅不同的黑做“豆豆眼”质感（无高光）
        r(17, 12, 2, 2, template.eye);
        px(18, 12, "#2b3138");
        px(17, 13, "#2b3138");
        // 小徽记（整洁感）
        px(14, 17, template.accent); px(17, 18, template.accent);
      }
    }

    if (pet.species === "chick") chickShape();
    else if (pet.species === "slime") slimeShape();
    else if (pet.species === "fox") foxShape();
    else if (pet.species === "alarmBeast") alarmBeastShape();
    else if (pet.species === "dayGhost") dayGhostShape();
    else if (pet.species === "tidyCrow") tidyCrowShape();
    else catShape();
  }

  function drawPetPixels(sctx, pet, size) {
    const sharedBackground = (state && state.profile && state.profile.appearance && state.profile.appearance.background) || "草地小径";
    drawScenePixels(sctx, sharedBackground, size);
    drawPetBodyCorePixels(sctx, pet, size);
  }

  function getPetBodySprite(pet, size, displayForm) {
    if (!pet) return null;
    const formValue = pet.isEgg ? "egg" : (displayForm === undefined ? petDisplayFormValue(pet) : displayForm);
    if (formValue === "egg") return getEggSprite(pet.species, size || 32);
    const renderStage = clamp(Number(formValue) || 0, 0, pet.stage);
    return spriteCanvas("petBody:" + pet.species + ":" + renderStage, size || 32, function (sctx, canvasSize) {
      // 透明底，仅绘制本体像素
      drawPetBodyCorePixels(sctx, Object.assign({}, pet, { stage: renderStage, isEgg: false }), canvasSize);
    });
  }

  function getPetBodySpriteSafe(pet, size, displayForm) {
    try {
      return getPetBodySprite(pet, size, displayForm);
    } catch (error) {
      console.error("pet body sprite failed", error);
      return null;
    }
  }

  function getEmptyPetSprite(size) {
    const sharedBackground = (state && state.profile && state.profile.appearance && state.profile.appearance.background) || "草地小径";
    return spriteCanvas("pet:empty:" + sharedBackground, size || 32, function (sctx, canvasSize) {
      const unit = canvasSize / 32;
      drawScenePixels(sctx, sharedBackground, canvasSize);
      fillRect(sctx, 14 * unit, 9 * unit, 4 * unit, 14 * unit, "#f8f3dc");
      fillRect(sctx, 9 * unit, 14 * unit, 14 * unit, 4 * unit, "#f8f3dc");
      fillRect(sctx, 15 * unit, 10 * unit, 2 * unit, 12 * unit, "#d6ceb2");
      fillRect(sctx, 10 * unit, 15 * unit, 12 * unit, 2 * unit, "#d6ceb2");
    });
  }

  function getPetSprite(pet, size, displayForm) {
    const sharedBackground = (state && state.profile && state.profile.appearance && state.profile.appearance.background) || "草地小径";
    if (!pet) return getEmptyPetSprite(size || 32);
    const formValue = pet.isEgg ? "egg" : (displayForm === undefined ? petDisplayFormValue(pet) : displayForm);
    if (formValue === "egg") return getEggSprite(pet.species, size || 32);
    const renderStage = clamp(Number(formValue) || 0, 0, pet.stage);
    return spriteCanvas("pet:" + pet.species + ":" + renderStage + ":" + sharedBackground, size || 32, function (sctx, canvasSize) {
      drawPetPixels(sctx, Object.assign({}, pet, { stage: renderStage, isEgg: false }), canvasSize);
    });
  }

  function getPetSpriteSafe(pet, size, displayForm) {
    try {
      return getPetSprite(pet, size, displayForm);
    } catch (error) {
      console.error("pet sprite failed", error);
      return getEmptyPetSprite(size || 32);
    }
  }

  function drawBossPixels(sctx, bossKind, size) {
    const unit = size / 32;
    // Boss 背景：熬夜幽灵用「月夜营地」，混乱乌鸦用「黄昏山坡」，雪原魇灵用「落雪驿站」，其他 Boss 用「草地小径」
    let sceneName = "草地小径";
    if (bossKind === "ghost") sceneName = "月夜营地";
    else if (bossKind === "crow") sceneName = "黄昏山坡";
    else if (bossKind === "yeti") sceneName = "落雪驿站";
    else if (bossKind === "kraken") sceneName = "水下";
    drawScenePixels(sctx, sceneName, size);
    if (bossKind === "ghost") {
      const g0 = "#f8f9fc";
      const g1 = "#e0e4eb";
      const g2 = "#b8bec9";
      const g3 = "#9aa2af";
      const g4 = "#737c8b";
      // 波浪下沿 + 底部阴影（更像小幽灵裙摆）
      // 最底行做“间隔填充”，肉眼形成波浪感
      fillRect(sctx, 10 * unit, 23 * unit, 2 * unit, 1 * unit, g4);
      fillRect(sctx, 14 * unit, 23 * unit, 2 * unit, 1 * unit, g4);
      fillRect(sctx, 18 * unit, 23 * unit, 2 * unit, 1 * unit, g4);
      fillRect(sctx, 21 * unit, 23 * unit, 1 * unit, 1 * unit, g4);
      // 上一行补齐裙摆厚度，并在波谷处更深
      fillRect(sctx, 10 * unit, 22 * unit, 12 * unit, 1 * unit, g3);
      fillRect(sctx, 12 * unit, 22 * unit, 2 * unit, 1 * unit, g4);
      fillRect(sctx, 16 * unit, 22 * unit, 2 * unit, 1 * unit, g4);
      fillRect(sctx, 20 * unit, 22 * unit, 2 * unit, 1 * unit, g4);
      // 身体底部阴影
      fillRect(sctx, 10 * unit, 19 * unit, 12 * unit, 3 * unit, g2);
      fillRect(sctx, 11 * unit, 15 * unit, 10 * unit, 5 * unit, g1);
      fillRect(sctx, 12 * unit, 13 * unit, 8 * unit, 4 * unit, g0);
      fillRect(sctx, 13 * unit, 12 * unit, 6 * unit, 2 * unit, g0);
      // 眼睛更小更萌（1x1 + 小高光）
      fillRect(sctx, 15 * unit, 17 * unit, 1 * unit, 1 * unit, "#1a1d22");
      fillRect(sctx, 19 * unit, 17 * unit, 1 * unit, 1 * unit, "#1a1d22");
      fillRect(sctx, 15 * unit, 16 * unit, 1 * unit, 1 * unit, g0);
      fillRect(sctx, 19 * unit, 16 * unit, 1 * unit, 1 * unit, g0);
    } else if (bossKind === "crow") {
      const c0 = "#1a1d22";
      const c1 = "#2b3138";
      const c2 = "#3d4550";
      const c3 = "#5a6370";
      const beak = "#b87d4a";
      const beakD = "#8a5a30";
      // 更接近旧版：清晰的“乌鸦轮廓”（头 + 喙 + 展翼）
      // 身体
      fillRect(sctx, 10 * unit, 15 * unit, 12 * unit, 8 * unit, c1);
      fillRect(sctx, 10 * unit, 20 * unit, 12 * unit, 3 * unit, c0);
      // 左翼 / 右翼（更明确的翅膀形状）
      fillRect(sctx, 7 * unit, 13 * unit, 5 * unit, 7 * unit, c2);
      fillRect(sctx, 20 * unit, 13 * unit, 6 * unit, 7 * unit, c2);
      fillRect(sctx, 8 * unit, 15 * unit, 2 * unit, 4 * unit, c0);
      fillRect(sctx, 23 * unit, 15 * unit, 2 * unit, 4 * unit, c0);
      // 头部（右侧更高一点）
      fillRect(sctx, 16 * unit, 12 * unit, 6 * unit, 4 * unit, c1);
      fillRect(sctx, 17 * unit, 11 * unit, 4 * unit, 2 * unit, c2);
      fillRect(sctx, 18 * unit, 10 * unit, 2 * unit, 1 * unit, c3);
      // 喙（突出到右侧）
      fillRect(sctx, 22 * unit, 14 * unit, 4 * unit, 2 * unit, beakD);
      fillRect(sctx, 23 * unit, 15 * unit, 3 * unit, 1 * unit, beak);
      // 眼睛（小白点）
      fillRect(sctx, 18 * unit, 14 * unit, 1 * unit, 1 * unit, "#e8ece8");
      fillRect(sctx, 20 * unit, 14 * unit, 1 * unit, 1 * unit, "#e8ece8");
    } else if (bossKind === "giant") {
      const s0 = "#e8c4a0";
      const s1 = "#c49a70";
      const s2 = "#9a7048";
      const s3 = "#6b4a30";
      const s4 = "#4a3218";
      fillRect(sctx, 10 * unit, 24 * unit, 12 * unit, 2 * unit, s4);
      fillRect(sctx, 9 * unit, 22 * unit, 14 * unit, 4 * unit, s3);
      fillRect(sctx, 9 * unit, 13 * unit, 14 * unit, 10 * unit, s2);
      fillRect(sctx, 7 * unit, 14 * unit, 4 * unit, 6 * unit, s2);
      fillRect(sctx, 21 * unit, 14 * unit, 4 * unit, 6 * unit, s2);
      fillRect(sctx, 8 * unit, 15 * unit, 2 * unit, 4 * unit, s3);
      fillRect(sctx, 22 * unit, 15 * unit, 2 * unit, 4 * unit, s3);
      fillRect(sctx, 11 * unit, 12 * unit, 10 * unit, 6 * unit, s1);
      fillRect(sctx, 12 * unit, 11 * unit, 8 * unit, 3 * unit, s0);
      fillRect(sctx, 12 * unit, 15 * unit, 2 * unit, 2 * unit, s4);
      fillRect(sctx, 18 * unit, 15 * unit, 2 * unit, 2 * unit, s4);
      fillRect(sctx, 14 * unit, 19 * unit, 4 * unit, 2 * unit, s4);
    } else if (bossKind === "kraken") {
      const shell = "#1f5a4a";
      const shellLight = "#2f8a64";
      const tent = "#2e7b4a";
      const tentDark = "#1b4a33";
      const eyeWhite = "#f8f9fc";
      // 圆球头（主体）
      fillRect(sctx, 11 * unit, 8 * unit, 10 * unit, 10 * unit, shell);
      fillRect(sctx, 12 * unit, 9 * unit, 8 * unit, 8 * unit, shellLight);
      // 头顶部略亮
      fillRect(sctx, 13 * unit, 9 * unit, 6 * unit, 2 * unit, shellLight);
      // 眼白（无瞳孔）
      fillRect(sctx, 13 * unit, 12 * unit, 2 * unit, 2 * unit, eyeWhite);
      fillRect(sctx, 17 * unit, 12 * unit, 2 * unit, 2 * unit, eyeWhite);
      // 触须：从圆球底部（y=18）向四面八方延伸
      // 中间两条向下
      fillRect(sctx, 14 * unit, 18 * unit, 2 * unit, 6 * unit, tent);
      fillRect(sctx, 16 * unit, 18 * unit, 2 * unit, 6 * unit, tentDark);
      // 左下弯曲触须
      fillRect(sctx, 12 * unit, 18 * unit, 2 * unit, 4 * unit, tent);
      fillRect(sctx, 11 * unit, 21 * unit, 2 * unit, 3 * unit, tentDark);
      fillRect(sctx, 10 * unit, 22 * unit, 1 * unit, 3 * unit, tentDark);
      // 右下弯曲触须
      fillRect(sctx, 18 * unit, 18 * unit, 2 * unit, 4 * unit, tent);
      fillRect(sctx, 19 * unit, 21 * unit, 2 * unit, 3 * unit, tentDark);
      fillRect(sctx, 21 * unit, 22 * unit, 1 * unit, 3 * unit, tentDark);
      // 左侧向外伸出的触须
      fillRect(sctx, 11 * unit, 18 * unit, 3 * unit, 2 * unit, tent);
      fillRect(sctx, 9 * unit, 19 * unit, 2 * unit, 2 * unit, tentDark);
      // 右侧向外伸出的触须
      fillRect(sctx, 18 * unit, 18 * unit, 3 * unit, 2 * unit, tent);
      fillRect(sctx, 21 * unit, 19 * unit, 2 * unit, 2 * unit, tentDark);
    } else if (bossKind === "yeti") {
      const furLight = "#f4f1ea";
      const furMid = "#ded9cf";
      const furShadow = "#c4beb2";
      const face = "#f0efe8";
      const horn = "#c79b5a";
      const hornDark = "#8b6a39";
      const eye = "#1a1d22";
      const mouth = "#5b412e";
      const tooth = "#ffffff";

      // 地面阴影
      fillRect(sctx, 8 * unit, 23 * unit, 16 * unit, 2 * unit, furShadow);

      // 身体主体（略宽、圆滚）
      fillRect(sctx, 9 * unit, 14 * unit, 14 * unit, 10 * unit, furMid);
      fillRect(sctx, 10 * unit, 13 * unit, 12 * unit, 10 * unit, furLight);

      // 脸部区域（略凹进去的一块）
      fillRect(sctx, 12 * unit, 13 * unit, 8 * unit, 6 * unit, face);

      // 头顶毛绒
      fillRect(sctx, 11 * unit, 12 * unit, 10 * unit, 2 * unit, furLight);
      fillRect(sctx, 12 * unit, 11 * unit, 8 * unit, 1 * unit, furLight);

      // 角
      fillRect(sctx, 12 * unit, 10 * unit, 2 * unit, 2 * unit, hornDark);
      fillRect(sctx, 18 * unit, 10 * unit, 2 * unit, 2 * unit, hornDark);
      fillRect(sctx, 12 * unit, 9 * unit, 1 * unit, 1 * unit, horn);
      fillRect(sctx, 19 * unit, 9 * unit, 1 * unit, 1 * unit, horn);

      // 眼睛（空洞的白色）
      fillRect(sctx, 13 * unit, 15 * unit, 1 * unit, 2 * unit, "#ffffff");
      fillRect(sctx, 18 * unit, 15 * unit, 1 * unit, 2 * unit, "#ffffff");

      // 嘴巴 + 牙齿
      fillRect(sctx, 14 * unit, 18 * unit, 4 * unit, 2 * unit, mouth);
      fillRect(sctx, 14 * unit, 18 * unit, 1 * unit, 1 * unit, tooth);
      fillRect(sctx, 16 * unit, 18 * unit, 1 * unit, 1 * unit, tooth);

      // 手臂（下垂的毛绒手）
      fillRect(sctx, 8 * unit, 16 * unit, 2 * unit, 7 * unit, furMid);
      fillRect(sctx, 21 * unit, 16 * unit, 2 * unit, 7 * unit, furMid);
      fillRect(sctx, 8 * unit, 21 * unit, 2 * unit, 2 * unit, furShadow);
      fillRect(sctx, 21 * unit, 21 * unit, 2 * unit, 2 * unit, furShadow);

      // 腿
      fillRect(sctx, 11 * unit, 20 * unit, 3 * unit, 4 * unit, furShadow);
      fillRect(sctx, 18 * unit, 20 * unit, 3 * unit, 4 * unit, furShadow);
    } else {
      const m0 = "#7dd88d";
      const m1 = "#5bc86d";
      const m2 = "#3fa855";
      const m3 = "#2d8a3e";
      const m4 = "#1f6b2d";
      fillRect(sctx, 10 * unit, 22 * unit, 12 * unit, 2 * unit, m4);
      fillRect(sctx, 11 * unit, 20 * unit, 10 * unit, 4 * unit, m3);
      fillRect(sctx, 10 * unit, 16 * unit, 12 * unit, 6 * unit, m2);
      fillRect(sctx, 11 * unit, 14 * unit, 10 * unit, 4 * unit, m1);
      fillRect(sctx, 12 * unit, 12 * unit, 8 * unit, 3 * unit, m0);
      fillRect(sctx, 13 * unit, 11 * unit, 6 * unit, 2 * unit, m0);
      fillRect(sctx, 13 * unit, 17 * unit, 2 * unit, 2 * unit, "#1a1d22");
      fillRect(sctx, 17 * unit, 17 * unit, 2 * unit, 2 * unit, "#1a1d22");
    }
  }

  function getBossSprite(kind, size) {
    return spriteCanvas("boss:" + kind, size || 32, function (sctx, canvasSize) {
      drawBossPixels(sctx, kind, canvasSize);
    });
  }

  function getBossSpriteSafe(kind, size) {
    try {
      return getBossSprite(kind, size);
    } catch (error) {
      console.error("boss sprite failed", error);
      return spriteCanvas("boss:fallback:" + String(kind || "none") + ":" + (size || 32), size || 32, function (sctx, canvasSize) {
        const unit = canvasSize / 32;
        fillRect(sctx, 0, 0, canvasSize, canvasSize, "#1a2c2d");
        fillRect(sctx, 9 * unit, 12 * unit, 14 * unit, 10 * unit, "#5bc86d");
        fillRect(sctx, 10 * unit, 11 * unit, 12 * unit, 2 * unit, "#74da85");
        fillRect(sctx, 13 * unit, 16 * unit, 2 * unit, 2 * unit, "#0f1f12");
        fillRect(sctx, 18 * unit, 16 * unit, 2 * unit, 2 * unit, "#0f1f12");
      });
    }
  }

  function drawCompanionMonsterPixels(sctx, spriteKind, size) {
    const unit = size / 32;
    if (spriteKind === "mossling") {
      const moss = "#6fa55d";
      const mossLight = "#a7d39b";
      const mossDark = "#4e7a42";
      const lamp = "#f1d27a";
      const lampShade = "#b28b32";
      const body = "#8e7451";
      const bodyDark = "#675238";
      const eye = "#1f1c18";
      fillRect(sctx, 11 * unit, 19 * unit, 10 * unit, 6 * unit, body);
      fillRect(sctx, 12 * unit, 18 * unit, 8 * unit, 6 * unit, moss);
      fillRect(sctx, 13 * unit, 17 * unit, 6 * unit, 2 * unit, mossLight);
      fillRect(sctx, 10 * unit, 20 * unit, 2 * unit, 3 * unit, bodyDark);
      fillRect(sctx, 20 * unit, 20 * unit, 2 * unit, 3 * unit, bodyDark);
      fillRect(sctx, 14 * unit, 21 * unit, 1 * unit, 1 * unit, eye);
      fillRect(sctx, 18 * unit, 21 * unit, 1 * unit, 1 * unit, eye);
      fillRect(sctx, 12 * unit, 15 * unit, 2 * unit, 4 * unit, mossDark);
      fillRect(sctx, 11 * unit, 14 * unit, 4 * unit, 2 * unit, moss);
      fillRect(sctx, 10 * unit, 13 * unit, 5 * unit, 1 * unit, mossLight);
      fillRect(sctx, 18 * unit, 14 * unit, 2 * unit, 4 * unit, lampShade);
      fillRect(sctx, 17 * unit, 13 * unit, 4 * unit, 5 * unit, lamp);
      fillRect(sctx, 18 * unit, 14 * unit, 2 * unit, 2 * unit, "#fff1bb");
      fillRect(sctx, 18 * unit, 18 * unit, 2 * unit, 5 * unit, lampShade);
      fillRect(sctx, 13 * unit, 25 * unit, 2 * unit, 3 * unit, bodyDark);
      fillRect(sctx, 17 * unit, 25 * unit, 2 * unit, 3 * unit, bodyDark);
      return;
    }
    if (spriteKind === "snowman") {
      const snow = "#f4f8ff";
      const snowShade = "#cdd8ea";
      const snowDark = "#a8b7cd";
      const coal = "#2b313f";
      const carrot = "#d7853d";
      const scarf = "#6fa2d8";
      const twig = "#8b643e";
      fillRect(sctx, 10 * unit, 17 * unit, 12 * unit, 9 * unit, snowShade);
      fillRect(sctx, 11 * unit, 16 * unit, 10 * unit, 9 * unit, snow);
      fillRect(sctx, 13 * unit, 9 * unit, 6 * unit, 8 * unit, snowShade);
      fillRect(sctx, 12 * unit, 8 * unit, 8 * unit, 8 * unit, snow);
      fillRect(sctx, 15 * unit, 5 * unit, 2 * unit, 4 * unit, twig);
      fillRect(sctx, 12 * unit, 17 * unit, 8 * unit, 2 * unit, scarf);
      fillRect(sctx, 18 * unit, 18 * unit, 2 * unit, 4 * unit, scarf);
      fillRect(sctx, 14 * unit, 11 * unit, 1 * unit, 1 * unit, coal);
      fillRect(sctx, 17 * unit, 11 * unit, 1 * unit, 1 * unit, coal);
      fillRect(sctx, 16 * unit, 12 * unit, 2 * unit, 1 * unit, carrot);
      fillRect(sctx, 15 * unit, 13 * unit, 1 * unit, 1 * unit, coal);
      fillRect(sctx, 16 * unit, 14 * unit, 1 * unit, 1 * unit, coal);
      fillRect(sctx, 17 * unit, 13 * unit, 1 * unit, 1 * unit, coal);
      fillRect(sctx, 8 * unit, 18 * unit, 3 * unit, 1 * unit, twig);
      fillRect(sctx, 21 * unit, 18 * unit, 3 * unit, 1 * unit, twig);
      fillRect(sctx, 9 * unit, 19 * unit, 1 * unit, 2 * unit, twig);
      fillRect(sctx, 22 * unit, 19 * unit, 1 * unit, 2 * unit, twig);
      fillRect(sctx, 15 * unit, 19 * unit, 1 * unit, 1 * unit, coal);
      fillRect(sctx, 15 * unit, 22 * unit, 1 * unit, 1 * unit, coal);
      fillRect(sctx, 15 * unit, 25 * unit, 1 * unit, 3 * unit, snowDark);
      fillRect(sctx, 17 * unit, 25 * unit, 1 * unit, 3 * unit, snowDark);
      return;
    }
    fillRect(sctx, 11 * unit, 15 * unit, 10 * unit, 10 * unit, "#7aa56d");
    fillRect(sctx, 13 * unit, 18 * unit, 2 * unit, 2 * unit, "#1f1c18");
    fillRect(sctx, 17 * unit, 18 * unit, 2 * unit, 2 * unit, "#1f1c18");
  }

  function getCompanionBodySprite(companion, size) {
    const safeSize = size || 32;
    if (!companion) return spriteCanvas("companion:none:" + safeSize, safeSize, function () {});
    if (companion.spriteType === "hero") {
      const appearance = Object.assign({}, normalizedCompanionAppearance(companion.appearance), { hideBackground: true });
      return getCharacterSpriteSafe(appearance, safeSize);
    }
    return spriteCanvas("companion:monster:" + companion.id + ":" + safeSize, safeSize, function (sctx, canvasSize) {
      drawCompanionMonsterPixels(sctx, companion.spriteKind, canvasSize);
    });
  }

  function getCompanionSprite(companion, size) {
    return getCompanionBodySprite(companion, size || 32);
  }

  function getCompanionPortraitSceneSprite(companion, size) {
    const safeSize = size || 32;
    if (!companion) return getTreasureSprite(safeSize);
    return getCompanionSceneSprite(companion, companionPortraitSceneName(companion, null), safeSize);
  }

  function getCompanionCodexSprite(companion, size) {
    const safeSize = size || 32;
    if (!companion) return getTreasureSprite(safeSize);
    return getCompanionPortraitSceneSprite(companion, safeSize);
  }

  function getCompanionSceneSprite(companion, sceneName, size) {
    const safeSize = size || 32;
    const requestedSceneName = typeof sceneName === "string" ? sceneName.trim() : "";
    const actualSceneName = requestedSceneName && SCENE_THEMES[requestedSceneName]
      ? requestedSceneName
      : companionPortraitSceneName(companion, sceneName);
    return spriteCanvas("companion-scene:" + (companion ? companion.id : "none") + ":" + actualSceneName + ":" + safeSize, safeSize, function (sctx, canvasSize) {
      drawScenePixels(sctx, actualSceneName, canvasSize);
      const bodySprite = getCompanionBodySprite(companion, canvasSize);
      const spriteScale = companion && companion.spriteType === "hero" ? 0.9 : 0.78;
      const drawSize = Math.round(canvasSize * spriteScale);
      const drawX = Math.round((canvasSize - drawSize) / 2);
      const drawY = Math.round(canvasSize - drawSize - canvasSize * 0.02);
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(bodySprite, drawX, drawY, drawSize, drawSize);
    });
  }

function getTreasureSprite(size) {
    return spriteCanvas("treasure", size || 32, function (sctx, canvasSize) {
      const unit = canvasSize / 32;
      fillRect(sctx, 0, 0, canvasSize, canvasSize, "#8eb0c8");
      fillRect(sctx, 9 * unit, 9 * unit, 14 * unit, 11 * unit, "#9a6a27");
      fillRect(sctx, 10 * unit, 10 * unit, 12 * unit, 9 * unit, "#e9bf58");
      fillRect(sctx, 15 * unit, 10 * unit, 2 * unit, 9 * unit, "#7a4e1f");
      fillRect(sctx, 14 * unit, 13 * unit, 4 * unit, 4 * unit, "#fff0a5");
    });
  }

  function getEggSprite(species, size) {
    const sharedBackground = (state && state.profile && state.profile.appearance && state.profile.appearance.background) || "草地小径";
    return spriteCanvas("egg:" + species + ":" + sharedBackground, size || 32, function (sctx, canvasSize) {
      const unit = canvasSize / 32;
      drawScenePixels(sctx, sharedBackground, canvasSize);
      fillRect(sctx, 12 * unit, 11 * unit, 8 * unit, 10 * unit, "#efe7c7");
      const midColor = species === "tidyCrow" ? "#9a9a9a" : (PET_SPECIES[species] && PET_SPECIES[species].detail) || "#d6b45a";
      fillRect(sctx, 15 * unit, 15 * unit, 2 * unit, 3 * unit, midColor);
    });
  }

  function drawPetCareIcon(targetCtx, x, y, size, kind) {
    const unit = size / 16;
    if (kind === "pat") {
      fillRect(targetCtx, x + 5 * unit, y + 3 * unit, 6 * unit, 3 * unit, "#f0c8b0");
      fillRect(targetCtx, x + 3 * unit, y + 6 * unit, 2 * unit, 6 * unit, "#f0c8b0");
      fillRect(targetCtx, x + 5 * unit, y + 6 * unit, 2 * unit, 5 * unit, "#f0c8b0");
      fillRect(targetCtx, x + 7 * unit, y + 6 * unit, 2 * unit, 6 * unit, "#f0c8b0");
      fillRect(targetCtx, x + 9 * unit, y + 6 * unit, 2 * unit, 5 * unit, "#f0c8b0");
    } else if (kind === "feed") {
      fillRect(targetCtx, x + 3 * unit, y + 10 * unit, 10 * unit, 3 * unit, "#8a5f38");
      fillRect(targetCtx, x + 4 * unit, y + 8 * unit, 8 * unit, 2 * unit, "#d0c26a");
      fillRect(targetCtx, x + 5 * unit, y + 5 * unit, 2 * unit, 3 * unit, "#7bb55d");
      fillRect(targetCtx, x + 9 * unit, y + 4 * unit, 2 * unit, 4 * unit, "#de9b4c");
    } else if (kind === "potion") {
      fillRect(targetCtx, x + 6 * unit, y + 2 * unit, 4 * unit, 2 * unit, "#d8e4f8");
      fillRect(targetCtx, x + 5 * unit, y + 4 * unit, 6 * unit, 8 * unit, "#8464d6");
      fillRect(targetCtx, x + 6 * unit, y + 5 * unit, 4 * unit, 5 * unit, "#d8a6ff");
      fillRect(targetCtx, x + 4 * unit, y + 12 * unit, 8 * unit, 2 * unit, "#d8e4f8");
    }
  }

  function drawSupplyPixels(targetCtx, itemId, size) {
    const unit = size / 32;
    function r(x, y, w, h, color) {
      fillRect(targetCtx, x * unit, y * unit, w * unit, h * unit, color);
    }
    function px(x, y, color) {
      fillRect(targetCtx, x * unit, y * unit, 1 * unit, 1 * unit, color);
    }
    if (itemId === "supply-apple-juice") {
      r(14, 7, 4, 2, "#f0e7d4");
      r(15, 5, 2, 2, "#7d5630");
      r(12, 9, 8, 12, "#b34f3f");
      r(13, 10, 6, 9, "#f0a857");
      r(11, 20, 10, 2, "#e9f3ff");
      px(8, 17, "#7aad4f"); r(7, 18, 3, 3, "#d95858");
      px(9, 17, "#597c31"); px(8, 19, "#f7d88d");
    } else if (itemId === "supply-wheat-bread") {
      r(8, 13, 16, 9, "#bf7e3b");
      r(10, 11, 12, 3, "#dba75a");
      r(9, 12, 14, 2, "#e7c173");
      r(9, 22, 14, 2, "#8c5d2e");
      r(12, 14, 1, 6, "#f5deb0");
      r(16, 14, 1, 6, "#f5deb0");
      r(20, 14, 1, 6, "#f5deb0");
    } else if (itemId === "supply-energy-potion") {
      r(14, 6, 4, 3, "#e7edf7");
      r(13, 9, 6, 2, "#7d5630");
      r(11, 11, 10, 11, "#5c7fd6");
      r(12, 12, 8, 8, "#7af0ff");
      r(13, 21, 6, 2, "#e7edf7");
      px(15, 14, "#ffffff"); px(17, 16, "#ffffff");
    } else if (itemId === "supply-cookie") {
      r(10, 12, 12, 12, "#b7783e");
      r(11, 11, 10, 2, "#d59b59");
      px(13, 15, "#4b2f22"); px(18, 14, "#4b2f22"); px(16, 18, "#4b2f22");
      px(12, 20, "#4b2f22"); px(19, 19, "#4b2f22");
      px(14, 22, "#e6c37d"); px(17, 12, "#e6c37d");
    } else if (itemId === "supply-holy-water") {
      r(14, 5, 4, 3, "#fff3cf");
      r(13, 8, 6, 2, "#c8952f");
      r(11, 10, 10, 13, "#d8b24d");
      r(12, 11, 8, 10, "#ffe18a");
      r(13, 22, 6, 2, "#fff6de");
      r(15, 13, 2, 6, "#fff6de");
      r(13, 15, 6, 2, "#fff6de");
    }
  }

  function getSupplySprite(item, size) {
    return spriteCanvas("supply:" + String(item && item.id ? item.id : "none"), size || 32, function (sctx, canvasSize) {
      drawScenePixels(sctx, "草地小径", canvasSize);
      drawSupplyPixels(sctx, item && item.id, canvasSize);
    });
  }

  function getCatalogPreview(item, size) {
    const previewAppearance = {
      skin: "浅砂",
      hairColor: "麦金",
      hairStyle: item.category === "hair" ? item.unlockValue : "短发",
      eyeColor: "曜石黑",
      eyeStyle: "圆眼",
      mouthStyle: "平口-深棕",
      topColor: "草地绿",
      bottomColor: "深夜蓝",
      background: item.category === "background" ? item.unlockValue : "草地小径",
      topStyle: item.category === "top" ? item.unlockValue : "新手上衣",
      bottomStyle: item.category === "bottom" ? item.unlockValue : "新手下装",
      weapon: "无",
      weaponLeft: "无",
      weaponRight: "无",
      accessory: item.category === "accessory" ? item.unlockValue : "无",
    };
    if (item.category === "item") {
      const v = item.unlockValue;
      if (isShieldWeaponValue(v)) {
        previewAppearance.weaponLeft = v;
        previewAppearance.weaponRight = "无";
      } else {
        previewAppearance.weaponLeft = "无";
        previewAppearance.weaponRight = v;
      }
      previewAppearance.weapon = previewAppearance.weaponRight || "无";
    }
    if (item.category === "background") return getSceneSprite(item.unlockValue, size || 32);
    if (item.category === "petEgg") return getEggSprite(item.petSpecies, size || 32);
    if (item.category === "supply") return getSupplySprite(item, size || 32);
    return getCharacterSprite(previewAppearance, size || 32);
  }
  function drawSpriteFrame(targetCtx, sprite, x, y, size, frameColor) {
    const borderColor = frameColor || THEME.black;
    fillRect(targetCtx, x, y, size, size, borderColor);
    fillRect(targetCtx, x + 4, y + 4, size - 8, size - 8, THEME.paper);
    targetCtx.drawImage(sprite, x + 6, y + 6, size - 12, size - 12);
  }

  function bossStatusLabel(hp, maxHp) {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    if (ratio > 0.75) return "稳定";
    if (ratio > 0.45) return "受伤";
    if (ratio > 0.18) return "虚弱";
    return "残血";
  }

  function currentBossData() {
    ensureBossDeadline();
    const template = currentBossTemplate();
    return { name: template.name, level: template.level || 1, mood: bossStatusLabel(state.boss.hp, state.boss.maxHp), description: template.description, tip: template.tip, kind: template.kind, hp: state.boss.hp, maxHp: state.boss.maxHp };
  }

  function renderBackground(targetCtx, view, height) {
    fillRect(targetCtx, 0, 0, view.logicalWidth, height, THEME.sky);
    fillRect(targetCtx, 0, height - 180, view.logicalWidth, 180, THEME.ground);
    fillRect(targetCtx, 0, height - 110, view.logicalWidth, 110, THEME.groundDark);
    [[view.left + 70, 126, 160, 54], [view.left + view.contentWidth - 260, 250, 180, 54], [view.left + view.contentWidth * 0.52, 106, 120, 46]].forEach(function (cloud) {
      targetCtx.save();
      targetCtx.globalAlpha = 0.22;
      fillRect(targetCtx, cloud[0], cloud[1], cloud[2], cloud[3], THEME.cloudA);
      fillRect(targetCtx, cloud[0] + 16, cloud[1] - 10, cloud[2] - 32, cloud[3] + 6, THEME.cloudB);
      targetCtx.restore();
    });
  }

  function renderHeader(targetCtx, view) {
    const logoW = 420;
    const logoH = 110;
    const logoX = view.left + (view.contentWidth - logoW) / 2;
    const logoY = 46;
    const gearSize = 72;
    const gearX = view.left + view.contentWidth - gearSize - 12;
    const gearY = 52;
    fillRect(targetCtx, logoX + 10, logoY + 10, logoW, logoH, THEME.headerShadow);
    fillRect(targetCtx, logoX, logoY, logoW, logoH, THEME.frame);
    drawPixelText(targetCtx, "QUESTUP", logoX + logoW / 2, logoY + 18, { size: 34, color: THEME.yellow, align: "center", font: "sans-serif" });
    drawPixelText(targetCtx, "\u6210\u4e3a\u4f60\u4eba\u751f\u7684RPG\u4e3b\u89d2", logoX + logoW / 2, logoY + 66, { size: 16, color: "#f7ead6", align: "center", font: "sans-serif" });
    drawGearButton(targetCtx, gearX, gearY, gearSize);
    registerRegion(mainRegions, gearX, gearY, gearSize, gearSize, function () { setModal({ type: "settings" }); });
  }

  function renderDashboard(targetCtx, view, y) {
    const contentX = view.left;
    const w = view.contentWidth;
    const gap = 18;
    const medium = w < 1300;
    const stacked = w < 940;
    let boardHeight;
    let profileRect;
    let statsRect;
    let metersRect;
    let bossRect;
    if (!medium) {
      boardHeight = 360;
      const profileW = 480;
      const statsW = 290;
      const metersW = 320;
      const bossW = w - profileW - statsW - metersW - gap * 3;
      profileRect = { x: contentX + 16, y: y + 16, w: profileW, h: 328 };
      statsRect = { x: profileRect.x + profileRect.w + gap, y: y + 16, w: statsW, h: 328 };
      metersRect = { x: statsRect.x + statsRect.w + gap, y: y + 16, w: metersW, h: 328 };
      bossRect = { x: metersRect.x + metersRect.w + gap, y: y + 16, w: bossW, h: 328 };
    } else if (!stacked) {
      boardHeight = 656;
      const colW = (w - gap) / 2;
      profileRect = { x: contentX + 16, y: y + 16, w: colW - 16, h: 300 };
      statsRect = { x: contentX + 16 + colW, y: y + 16, w: colW - 16, h: 300 };
      metersRect = { x: contentX + 16, y: y + 332, w: colW - 16, h: 308 };
      bossRect = { x: contentX + 16 + colW, y: y + 332, w: colW - 16, h: 308 };
    } else {
      boardHeight = 1172;
      profileRect = { x: contentX + 16, y: y + 16, w: w - 32, h: 270 };
      statsRect = { x: contentX + 16, y: y + 302, w: w - 32, h: 268 };
      metersRect = { x: contentX + 16, y: y + 586, w: w - 32, h: 252 };
      bossRect = { x: contentX + 16, y: y + 854, w: w - 32, h: 302 };
    }
    drawPanel(targetCtx, contentX, y, w, boardHeight, THEME.frame);
    anchors.pageTop = y;
    const pet = currentPet();
    const hero = getCharacterSpriteSafe(state.profile.appearance, 96);
    const petSprite = getPetSpriteSafe(pet, 48, petDisplayFormValue(pet));
    const boss = currentBossData();
    const bossSprite = getBossSpriteSafe(boss.kind, 72);
    const bossTemplateFull = currentBossTemplate();
    const heroName = state.profile.name || HERO_ROLE;
    const profileTextX = profileRect.x + 300;
    const profileTextW = profileRect.w - 340;
    const profileLight = THEME.paperSoft;
    const profileSoft = "#f0d8cc";
    drawCard(targetCtx, profileRect.x, profileRect.y, profileRect.w, profileRect.h, THEME.frame);
    drawSpriteFrame(targetCtx, hero, profileRect.x + 36, profileRect.y + 42, 224);
    drawSpriteFrame(targetCtx, petSprite, profileRect.x + 206, profileRect.y + 206, 92);
    drawTextFitted(targetCtx, heroName, profileTextX, profileRect.y + 90, profileTextW, 36, profileLight, "700", "left", 22);
    drawTextFitted(targetCtx, "Lv." + state.profile.level, profileTextX, profileRect.y + 144, profileTextW, 24, profileSoft, "700", "left", 18);
    drawTextFitted(targetCtx, roleSubtitle(state.profile.level), profileTextX, profileRect.y + 188, profileTextW, 28, profileLight, "700", "left", 18);
    registerRegion(mainRegions, profileRect.x + 36, profileRect.y + 42, 224, 224, function () {
      if (state.pureMode) {
        setToast("纯净模式下，像素衣柜已锁定，请专注完成任务。", "info");
        renderApp();
        return;
      }
      setModal({ type: "editor" });
    }, { tooltip: "点击头像编辑角色与背景" });
    registerRegion(mainRegions, profileRect.x + 206, profileRect.y + 206, 92, 92, function () {
      if (state.pureMode) {
        setToast("纯净模式下，像素衣柜已锁定，请专注完成任务。", "info");
        renderApp();
        return;
      }
      setModal({ type: "editor" });
    }, { tooltip: "点击头像编辑角色与背景" });
    drawCard(targetCtx, statsRect.x, statsRect.y, statsRect.w, statsRect.h, THEME.paper);
    const statGap = 18;
    const statW = (statsRect.w - statGap - 32) / 2;
    const statH = (statsRect.h - 40 - statGap * 2) / 3;
    drawStatBox(targetCtx, statsRect.x + 16, statsRect.y + 16, statW, statH, "LV", state.profile.level);
    drawStatBox(targetCtx, statsRect.x + 16 + statW + statGap, statsRect.y + 16, statW, statH, "GOLD", state.profile.gold);
    drawStatBox(targetCtx, statsRect.x + 16, statsRect.y + 16 + statH + statGap, statW, statH, "HP", state.profile.hp);
    drawStatBox(targetCtx, statsRect.x + 16 + statW + statGap, statsRect.y + 16 + statH + statGap, statW, statH, "EXP", state.profile.exp);
    drawStatBox(targetCtx, statsRect.x + 16, statsRect.y + 16 + (statH + statGap) * 2, statW, statH, "STREAK", state.profile.streak);
    drawStatBox(targetCtx, statsRect.x + 16 + statW + statGap, statsRect.y + 16 + (statH + statGap) * 2, statW, statH, "DONE", state.profile.done);
    drawCard(targetCtx, metersRect.x, metersRect.y, metersRect.w, metersRect.h, THEME.paper);
    drawMeter(targetCtx, metersRect.x + 34, metersRect.y + 64, metersRect.w - 68, state.profile.exp, state.profile.expToNext, [THEME.expA, THEME.expB], "EXP", { textSize: 20, minTextSize: 14, textOffsetY: 34 });
    drawMeter(targetCtx, metersRect.x + 34, metersRect.y + 148, metersRect.w - 68, state.profile.hp, state.profile.maxHp, [THEME.hpA, THEME.hpB], "HP", { textSize: 20, minTextSize: 14, textOffsetY: 34 });
    const mood = currentHeroMood();
    const moodName = mood.name;
    const moodBaseY = stacked ? (metersRect.y + 184) : (metersRect.y + 192);
    const moodText = "心情：" + moodName;
    drawText(targetCtx, moodText, metersRect.x + 34, moodBaseY, 18, THEME.ink, "600");
    const moodDesc = "“" + mood.desc + "”";
    drawParagraph(targetCtx, moodDesc, metersRect.x + 34, moodBaseY + 26, metersRect.w - 68, 14, THEME.inkSoft, 20, { maxLines: 2 });
    const moodLabelWidth = measureStyledTextWidth(targetCtx, moodText, 18, "600", null);
    const tooltipText = "在「" + moodName + "」状态下，任务获得的 EXP ×" + (mood.expMultiplier || 1).toFixed(1) + "。";
    registerRegion(mainRegions, metersRect.x + 34, moodBaseY - 4, moodLabelWidth + 10, 24, function () {}, { cursor: "default", tooltip: tooltipText });
    drawCard(targetCtx, bossRect.x, bossRect.y, bossRect.w, bossRect.h, THEME.paper);
    drawPixelText(targetCtx, "当前 Boss", bossRect.x + 22, bossRect.y + 24, { size: 14, color: THEME.inkSoft, font: "sans-serif" });
    drawTextFitted(targetCtx, boss.mood, bossRect.x + bossRect.w - 36, bossRect.y + 22, 84, 22, THEME.ink, "500", "right", 15);
    const bossTextX = bossRect.x + (stacked ? 158 : 182);
    const bossTextWidth = bossRect.w - (bossTextX - bossRect.x) - 28;
    drawTextFitted(targetCtx, boss.name + " Lv." + boss.level, bossRect.x + 22, bossRect.y + 64, bossRect.w - 64, 28, THEME.ink, "700", "left", 18);
    drawSpriteFrame(targetCtx, bossSprite, bossRect.x + 22, bossRect.y + 118, stacked ? 120 : 132);
    const bossDescY = bossRect.y + (bossTemplateFull && bossTemplateFull.id === "abyss-kraken" ? 110 : 132);
    drawParagraph(targetCtx, boss.description, bossTextX, bossDescY, bossTextWidth, 15, THEME.inkSoft, 22, { maxLines: stacked ? 2 : 3 });
    drawMeter(targetCtx, bossTextX, bossRect.y + 205, bossRect.w - (bossTextX - bossRect.x) - 34, boss.hp, boss.maxHp, [THEME.bossA, THEME.bossB], "BOSS HP", { textSize: 20, minTextSize: 14, textOffsetY: 34 });
    drawJustifiedParagraph(targetCtx, boss.tip, bossTextX, bossRect.y + 254, bossTextWidth, 15, THEME.inkSoft, 21, { maxLines: 2 });
    if (bossTemplateFull && bossTemplateFull.timeLimitHours && typeof state._bossLastRemaining === "number" && state._bossLastRemaining > 0) {
      const spriteBottom = bossRect.y + 118 + (stacked ? 120 : 132);
      const countdownText = "还有 " + formatClockHms(state._bossLastRemaining) + " 截止";
      drawText(targetCtx, countdownText, bossRect.x + 22, spriteBottom + 18, 13, THEME.inkSoft, "500");
    }
    return y + boardHeight;
  }

  function renderNav(targetCtx, view, y) {
    const tabs = [["tasks", "任务页"], ["shop", "商店页"], ["pets", "社交页"], ["adventure", "冒险页"], ["journal", "日志页"]];
    const contentX = view.left;
    const w = view.contentWidth;
    const gap = 14;
    const phoneReadable = view.width <= 560;
    const rowBreak = w < 1020;
    const panelHeight = rowBreak ? (phoneReadable ? 164 : 154) : 102;
    drawPanel(targetCtx, contentX, y, w, panelHeight, THEME.frame);
    if (!rowBreak) {
      const buttonW = (w - 32 - gap * 4) / 5;
      tabs.forEach(function (tab, index) {
        const x = contentX + 16 + index * (buttonW + gap);
        const disabled = state.pureMode && tab[0] !== "tasks";
        drawButton(targetCtx, x, y + 18, buttonW, 62, tab[1], disabled ? "disabled" : (state.page === tab[0] ? "yellow" : "paper"), {
          active: !disabled && state.page === tab[0],
          disabled: disabled,
          fontSize: 24,
          minFontSize: 18
        });
        registerRegion(mainRegions, x, y + 18, buttonW, 62, function () {
          if (state.pureMode && tab[0] !== "tasks") {
            setToast("纯净模式下，该页面已锁定，请专注完成任务。", "info");
            renderApp();
            return;
          }
          state.page = tab[0];
          saveState();
          renderApp();
        });
      });
    } else {
      const buttonW = (w - 32 - gap * 2) / 3;
      tabs.forEach(function (tab, index) {
        const row = index < 3 ? 0 : 1;
        const col = index < 3 ? index : index - 3;
        const width = row === 1 ? (w - 32 - gap) / 2 : buttonW;
        const x = row === 0 ? contentX + 16 + col * (buttonW + gap) : contentX + 16 + col * (width + gap);
        const yPos = y + 18 + row * (phoneReadable ? 66 : 64);
        const disabled = state.pureMode && tab[0] !== "tasks";
        drawButton(targetCtx, x, yPos, width, 54, tab[1], disabled ? "disabled" : (state.page === tab[0] ? "yellow" : "paper"), {
          active: !disabled && state.page === tab[0],
          small: true,
          disabled: disabled,
          fontSize: phoneReadable ? 24 : 22,
          minFontSize: 16
        });
        registerRegion(mainRegions, x, yPos, width, 54, function () {
          if (state.pureMode && tab[0] !== "tasks") {
            setToast("纯净模式下，该页面已锁定，请专注完成任务。", "info");
            renderApp();
            return;
          }
          state.page = tab[0];
          saveState();
          renderApp();
        });
      });
    }
    return y + panelHeight;
  }

  function groupedTasks() {
    return {
      todo: state.tasks.filter(function (task) { return task.bucket === "todo"; }),
      habit: state.tasks.filter(function (task) { return task.bucket === "habit"; }),
      learn: state.tasks.filter(function (task) { return task.bucket === "learn"; }),
    };
  }

  function taskCardHeight(task) {
    return 236;
  }

  function bucketSectionHeaderHeight(width, options) {
    const sectionOptions = options || {};
    const titleSize = sectionOptions.titleSize || 34;
    const titleOffsetY = sectionOptions.titleOffsetY || 36;
    const baseHeaderHeight = sectionOptions.headerHeight || Math.max(88, titleOffsetY + titleSize + 18);
    const headerActions = Array.isArray(sectionOptions.headerActions) && sectionOptions.headerActions.length
      ? sectionOptions.headerActions.filter(Boolean)
      : (sectionOptions.actionLabel && sectionOptions.onAction ? [{
        label: sectionOptions.actionLabel,
        variant: sectionOptions.actionVariant || "paper",
        onClick: sectionOptions.onAction,
        width: sectionOptions.actionWidth || 172,
        disabled: Boolean(sectionOptions.actionDisabled)
      }] : []);
    if (!headerActions.length) return baseHeaderHeight;
    const actionGap = 12;
    const actionHeight = 44;
    const totalActionWidth = headerActions.reduce(function (sum, action, index) {
      return sum + (action.width || 172) + (index > 0 ? actionGap : 0);
    }, 0);
    const stackHeaderActions = Boolean(sectionOptions.stackHeaderActions) || totalActionWidth > Math.max(180, width - 140);
    if (!stackHeaderActions) return baseHeaderHeight;
    const actionStartOffset = titleOffsetY + titleSize + 18;
    return Math.max(baseHeaderHeight, actionStartOffset + headerActions.length * actionHeight + (headerActions.length - 1) * actionGap + 8);
  }

  function bucketSectionHeight(tasks, options, width) {
    const headerHeight = bucketSectionHeaderHeight(width || 0, options);
    if (!tasks || tasks.length === 0) return headerHeight + 108;
    return headerHeight + 14 + tasks.reduce(function (total, task, index) {
      return total + taskCardHeight(task) + (index < tasks.length - 1 ? 18 : 0);
    }, 0);
  }

  function bucketSectionActions(options) {
    const sectionOptions = options || {};
    return Array.isArray(sectionOptions.headerActions) && sectionOptions.headerActions.length
      ? sectionOptions.headerActions.filter(Boolean)
      : (sectionOptions.actionLabel && sectionOptions.onAction ? [{
        label: sectionOptions.actionLabel,
        variant: sectionOptions.actionVariant || "paper",
        onClick: sectionOptions.onAction,
        width: sectionOptions.actionWidth || 172,
        disabled: Boolean(sectionOptions.actionDisabled)
      }] : []);
  }

  function bucketSectionShouldStackActions(width, options) {
    const headerActions = bucketSectionActions(options);
    if (!headerActions.length) return false;
    if (options && options.stackHeaderActions) return true;
    const actionGap = 12;
    const totalActionWidth = headerActions.reduce(function (sum, action, index) {
      return sum + (action.width || 172) + (index > 0 ? actionGap : 0);
    }, 0);
    return totalActionWidth > Math.max(180, width - 140);
  }

  function bucketSectionInlineActionWidth(options) {
    return bucketSectionActions(options).reduce(function (sum, action, index) {
      return sum + (action.width || 172) + (index > 0 ? 12 : 0);
    }, 0);
  }

  function bucketSectionHeightLegacy(tasks) {
    if (!tasks || tasks.length === 0) return 196;
    return 84 + tasks.reduce(function (total, task) {
      return total + taskCardHeight(task) + 18;
    }, 0);
  }

  function drawStatusTag(targetCtx, x, y, label, variant, minWidth) {
    const width = Math.max(minWidth || 96, Math.min(220, measureTextWidth(label, 18) + 34));
    drawButton(targetCtx, x, y, width, 36, label, variant, { small: true });
    return width;
  }

  function renderTaskCard(targetCtx, x, y, width, task) {
    const diff = DIFFICULTIES[task.difficulty];
    const isTodo = task.bucket === "todo";
    const isCompleted = isTodo ? task.completed : false;
    const cardHeight = taskCardHeight(task);
    const deadlineMeta = isTodo ? buildTodoDeadlineMeta(task, Date.now()) : null;
    const repeatMeta = !isTodo ? buildRepeatTaskMeta(task) : null;
    drawCard(targetCtx, x, y, width, cardHeight, THEME.paper);
    drawTextFitted(targetCtx, task.title, x + 24, y + 26, width - 180, 28, THEME.ink, "700", "left", 18);
    registerRegion(mainRegions, x + 24, y + 26, width - 180, 28, function () {}, { tooltip: "双击来修改名称", regionKey: "task-" + task.id, onDblClick: function () { openRenameTask(task.id); } });
    if (isTodo) drawTodoCheckbox(targetCtx, x + width - 72, y + 22, isCompleted);
    drawText(targetCtx, diff.label + "  /  +" + diff.exp + " EXP  /  +" + diff.gold + " 金币  /  -" + diff.hpCost + " HP", x + 24, y + 82, 20, THEME.inkSoft, "500");
    const bucket = TASK_BUCKET_OPTIONS[task.bucket] || TASK_BUCKET_OPTIONS.todo;
    drawButton(targetCtx, x + width - (isTodo ? 174 : 112), y + 24, 88, 46, bucket.badge, isTodo ? "paper" : task.bucket === "learn" ? "lilac" : "blue", { small: true });
    if (isTodo && deadlineMeta) {
      if (deadlineMeta.dueTagLabel) drawStatusTag(targetCtx, x + 24, y + 108, deadlineMeta.dueTagLabel, "paper", 128);
      else drawTextFitted(targetCtx, deadlineMeta.dueLabel, x + 24, y + 110, width - 48, 20, THEME.inkSoft, "600", "left", 12);
      if (deadlineMeta.statusLabel) {
        if (deadlineMeta.statusVariant === "completed") drawStatusTag(targetCtx, x + 24, y + 146, deadlineMeta.statusLabel, "green", 96);
        else {
          const countdownColor = deadlineMeta.statusVariant === "overdue" ? THEME.red : THEME.ink;
          drawTextFitted(targetCtx, deadlineMeta.statusLabel, x + 24, y + 148, width - 48, 20, countdownColor, "600", "left", 12);
        }
      }
    } else if (repeatMeta) {
      drawTextFitted(targetCtx, repeatMeta.countLabel, x + 24, y + 110, width - 48, 20, THEME.inkSoft, "600", "left", 12);
      drawTextFitted(targetCtx, repeatMeta.lastLabel, x + 24, y + 138, width - 48, 20, THEME.inkSoft, "600", "left", 12);
    }
    const buttonWidth = (width - 54 - 36) / 3;
    const completeLabel = isTodo ? (isCompleted ? "已勾选" : "完成") : task.bucket === "habit" ? "打卡" : "学习";
    const disableComplete = isTodo && isCompleted;
    const actionsY = y + 174;
    drawButton(targetCtx, x + 18, actionsY, buttonWidth, 48, completeLabel, "green", { small: true, disabled: disableComplete });
    drawButton(targetCtx, x + 18 + buttonWidth + 18, actionsY, buttonWidth, 48, "番茄", "yellow", { small: true, disabled: disableComplete });
    drawButton(targetCtx, x + 18 + (buttonWidth + 18) * 2, actionsY, buttonWidth, 48, "删除", "red", { small: true });
    if (!disableComplete) {
      registerRegion(mainRegions, x + 18, actionsY, buttonWidth, 48, function () { completeTask(task.id, false); });
      registerRegion(mainRegions, x + 18 + buttonWidth + 18, actionsY, buttonWidth, 48, function () { openPomodoro(task.id); });
    }
    registerRegion(mainRegions, x + 18 + (buttonWidth + 18) * 2, actionsY, buttonWidth, 48, function () { deleteTask(task.id); });
    return cardHeight;
  }

  function renderBucketSection(targetCtx, x, y, width, title, subtitle, tasks, options) {
    const sectionOptions = options || {};
    const subtitleSize = sectionOptions.subtitleSize || 18;
    const titleSize = sectionOptions.titleSize || 34;
    const titleOffsetY = sectionOptions.titleOffsetY || 36;
    const baseHeaderHeight = sectionOptions.headerHeight || Math.max(88, titleOffsetY + titleSize + 18);
    const headerHeight = bucketSectionHeaderHeight(width, sectionOptions);
    drawPixelText(targetCtx, subtitle, x, y, { size: subtitleSize, color: THEME.inkSoft, font: "sans-serif" });
    drawText(targetCtx, title, x + 2, y + titleOffsetY, titleSize, THEME.ink, "700");
    const headerActions = bucketSectionActions(sectionOptions);
    if (headerActions.length) {
      const actionGap = 12;
      const actionHeight = 44;
      if (bucketSectionShouldStackActions(width, sectionOptions)) {
        const actionX = x + 12;
        const actionWidth = width - 24;
        const actionStartY = y + titleOffsetY + titleSize + 18;
        headerActions.forEach(function (action, index) {
          const actionY = actionStartY + index * (actionHeight + actionGap);
          const disabled = Boolean(action.disabled);
          drawButton(targetCtx, actionX, actionY, actionWidth, actionHeight, action.label, action.variant || "paper", {
            small: true,
            disabled: disabled,
            fontSize: 18,
            minFontSize: 12
          });
          if (!disabled && action.onClick) registerRegion(mainRegions, actionX, actionY, actionWidth, actionHeight, action.onClick);
        });
      } else {
        const totalActionWidth = bucketSectionInlineActionWidth(sectionOptions);
        let actionX = x + width - totalActionWidth;
        headerActions.forEach(function (action) {
          const actionWidth = action.width || 172;
          const disabled = Boolean(action.disabled);
          drawButton(targetCtx, actionX, y + 18, actionWidth, actionHeight, action.label, action.variant || "paper", { small: true, disabled: disabled });
          if (!disabled && action.onClick) registerRegion(mainRegions, actionX, y + 18, actionWidth, actionHeight, action.onClick);
          actionX += actionWidth + actionGap;
        });
      }
    }
    let cursorY = y + headerHeight;
    if (tasks.length === 0) {
      drawCard(targetCtx, x, cursorY, width, 90, THEME.paper);
      drawText(targetCtx, sectionOptions.emptyText || "这里还没有任务，先加一个小目标吧。", x + width / 2, cursorY + 26, 22, THEME.inkSoft, "500", "center");
      return cursorY + 108;
    }
    tasks.forEach(function (task, index) {
      cursorY += renderTaskCard(targetCtx, x, cursorY, width, task) + (index < tasks.length - 1 ? 18 : 0);
    });
    return cursorY + 14;
  }

  function drawInputField(targetCtx, x, y, width, height, label, value, placeholder, fieldKey, numeric) {
    drawText(targetCtx, label, x, y, 16, THEME.inkSoft, "500");
    drawCard(targetCtx, x, y + 24, width, height, THEME.paper);
    inputFieldMap[fieldKey] = { x: x, y: y + 24, width: width, height: height, overlay: targetCtx === overlayCtx, placeholder: placeholder };
    const display = value || placeholder;
    drawText(targetCtx, display, x + 22, y + 52, 24, value ? THEME.ink : "#9f9482", "500");
    if (activeInput && activeInput.fieldKey === fieldKey && hiddenInput !== document.activeElement && Date.now() % 1000 < 500) {
      fillRect(targetCtx, x + 24 + measureTextWidth(display, 24), y + 56, 4, 26, THEME.ink);
    }
    registerRegion(targetCtx === overlayCtx ? overlayRegions : mainRegions, x, y + 24, width, height, function () { activateInput(fieldKey, numeric); }, { keepInput: true });
  }

  function drawSelectorField(targetCtx, x, y, width, height, label, value, onClick) {
    drawText(targetCtx, label, x, y, 16, THEME.inkSoft, "500");
    drawCard(targetCtx, x, y + 24, width, height, THEME.paper);
    drawText(targetCtx, value, x + 22, y + 52, 24, THEME.ink, "500");
    if (onClick) {
      drawText(targetCtx, "v", x + width - 34, y + 54, 26, THEME.inkSoft, "500");
      registerRegion(targetCtx === overlayCtx ? overlayRegions : mainRegions, x, y + 24, width, height, onClick);
    }
  }

  function drawCenteredInputField(targetCtx, x, y, width, height, label, value, placeholder, fieldKey, numeric) {
    drawText(targetCtx, label, x + width / 2, y, 16, THEME.inkSoft, "500", "center");
    drawCard(targetCtx, x, y + 24, width, height, THEME.paper);
    inputFieldMap[fieldKey] = { x: x, y: y + 24, width: width, height: height, overlay: targetCtx === overlayCtx, placeholder: placeholder };
    const display = value || placeholder;
    const displaySize = fitCanvasTextSize(display, width - 36, 24, "500", 14);
    drawText(targetCtx, display, x + width / 2, y + 52, displaySize, value ? THEME.ink : "#9f9482", "500", "center");
    if (activeInput && activeInput.fieldKey === fieldKey && hiddenInput !== document.activeElement && Date.now() % 1000 < 500) {
      const displayWidth = measureStyledTextWidth(targetCtx, display, displaySize, "500", null);
      fillRect(targetCtx, x + width / 2 + displayWidth / 2 + 4, y + 56, 4, 26, THEME.ink);
    }
    registerRegion(targetCtx === overlayCtx ? overlayRegions : mainRegions, x, y + 24, width, height, function () { activateInput(fieldKey, numeric); }, { keepInput: true });
  }

  function drawCompactSelectorField(targetCtx, x, y, width, height, label, value, onClick, register, clipRect) {
    drawText(targetCtx, label, x + width / 2, y, 15, THEME.inkSoft, "500", "center");
    drawCard(targetCtx, x, y + 22, width, height, THEME.paper);
    drawTextFitted(targetCtx, value, x + width / 2, y + 46, width - 34, 22, THEME.ink, "600", "center", 11);
    if (onClick && (register !== false)) {
      drawText(targetCtx, "v", x + width - 28, y + 48, 22, THEME.inkSoft, "500");
      const target = targetCtx === overlayCtx ? overlayRegions : mainRegions;
      const fieldY = y + 22;
      if (clipRect) {
        const fullyVisible =
          x >= clipRect.x &&
          fieldY >= clipRect.y &&
          x + width <= clipRect.x + clipRect.width &&
          fieldY + height <= clipRect.y + clipRect.height;
        if (fullyVisible) registerRegion(target, x, fieldY, width, height, onClick);
      } else {
        registerRegion(target, x, fieldY, width, height, onClick);
      }
    }
  }

  function renderComposer(targetCtx, x, y, width) {
    anchors.composer = y;
    const compactLayout = width < 1180;
    const panelHeight = compactLayout ? 980 : 620;
    const innerWidth = width - 68;
    const gap = 24;
    const columnWidth = compactLayout ? innerWidth : Math.floor((innerWidth - gap) / 2);
    const leftX = x + 34;
    const rightX = compactLayout ? leftX : leftX + columnWidth + gap;
    const topY = y + 124;
    const taskCardHeight = 446;
    const rewardCardHeight = 350;
    const rewardY = compactLayout ? topY + taskCardHeight + 22 : topY;
    drawPanel(targetCtx, x, y, width, panelHeight, THEME.paper);
    drawSectionHeader(targetCtx, x + 30, y + 30, "创建内容", "创建一个任务或奖励");

    drawCard(targetCtx, leftX, topY, columnWidth, taskCardHeight, THEME.paper);
    drawText(targetCtx, "新增任务", leftX + 18, topY + 16, 20, THEME.inkSoft, "500");
    drawInputField(targetCtx, leftX + 18, topY + 52, columnWidth - 36, 72, "名称", state.composer.taskTitle, "例如：整理桌面", "taskTitle", false);
    drawSelectorField(targetCtx, leftX + 18, topY + 164, columnWidth - 36, 72, "类型", (TASK_BUCKET_OPTIONS[state.composer.taskBucket] || TASK_BUCKET_OPTIONS.todo).selector, cycleComposerBucket);
    drawSelectorField(targetCtx, leftX + 18, topY + 276, columnWidth - 36, 72, "难度", DIFFICULTIES[state.composer.taskDifficulty].label, function () { cycleDifficulty("taskDifficulty"); });
    drawButton(targetCtx, leftX + 18, topY + taskCardHeight - 76, columnWidth - 36, 56, "加入任务栏", "green");
    registerRegion(mainRegions, leftX + 18, topY + taskCardHeight - 76, columnWidth - 36, 56, createTaskEntry);

    drawCard(targetCtx, rightX, rewardY, columnWidth, rewardCardHeight, THEME.paper);
    drawText(targetCtx, "新增奖励", rightX + 18, rewardY + 16, 20, THEME.inkSoft, "500");
    drawInputField(targetCtx, rightX + 18, rewardY + 52, columnWidth - 36, 72, "奖励名", state.composer.rewardName, "例如：喝奶茶", "rewardName", false);
    drawInputField(targetCtx, rightX + 18, rewardY + 164, columnWidth - 36, 72, "价格", state.composer.rewardPrice, "20", "rewardPrice", true);
    drawButton(targetCtx, rightX + 18, rewardY + rewardCardHeight - 76, columnWidth - 36, 56, "添加奖励", "yellow");
    registerRegion(mainRegions, rightX + 18, rewardY + rewardCardHeight - 76, columnWidth - 36, 56, createRewardEntry);
    return y + panelHeight;
  }

  function renderRewards(targetCtx, x, y, width) {
    const cardHeight = 132;
    const hasRewards = state.rewards.length > 0;
    const sectionHeight = hasRewards ? 120 + state.rewards.length * (cardHeight + 18) : 236;
    const outerPad = 18; // avoid touching page outer frame
    const shellX = x + outerPad;
    const shellY = y + 10;
    const shellW = width - outerPad * 2;
    const shellH = sectionHeight - 20;
    const shell = drawSectionShell(targetCtx, shellX, shellY, shellW, shellH, {});
    drawText(targetCtx, "自定义奖励", shellX + 26, shellY + 18, 22, THEME.ink, "700");
    drawText(targetCtx, "你给自己准备的小奖励", shellX + 26, shellY + 46, 16, THEME.inkSoft, "600");
    let cursor = shellY + shell.barH + 20;
    if (!hasRewards) {
      drawCard(targetCtx, shellX + 18, cursor, shellW - 36, 72, THEME.paper);
      drawText(targetCtx, "这里还没有奖励，注意劳逸结合哦", shellX + shellW / 2, cursor + 22, 22, THEME.inkSoft, "500", "center");
      return y + sectionHeight;
    }
    state.rewards.forEach(function (reward) {
      const cardW = shellW - 36;
      const nameRegionW = cardW - 48 - 260;
      drawCard(targetCtx, shellX + 18, cursor, cardW, cardHeight, THEME.paper);
      drawText(targetCtx, reward.name, shellX + 38, cursor + 26, 28, THEME.ink, "700");
      registerRegion(mainRegions, shellX + 38, cursor + 26, Math.max(100, nameRegionW), 32, function () {}, { tooltip: "双击来修改名称", regionKey: "reward-" + reward.id, onDblClick: function () { openRenameReward(reward.id); } });
      drawText(targetCtx, reward.price + " 金币", shellX + 38, cursor + 82, 20, THEME.inkSoft, "500");
      const enough = state.profile.gold >= reward.price;
      drawButton(targetCtx, shellX + shellW - 244, cursor + 24, 96, 68, enough ? "兑换" : "不够钱", enough ? "yellow" : "disabled");
      drawButton(targetCtx, shellX + shellW - 136, cursor + 24, 96, 68, "删除", "red");
      if (enough) registerRegion(mainRegions, shellX + shellW - 244, cursor + 24, 96, 68, function () { exchangeReward(reward.id); });
      registerRegion(mainRegions, shellX + shellW - 136, cursor + 24, 96, 68, function () { deleteReward(reward.id); });
      cursor += cardHeight + 18;
    });
    return y + sectionHeight;
  }
  function renderRest(targetCtx, x, y, width) {
    const cardHeight = 132;
    const supplies = ownedSupplyItems();
    const hasSupplies = supplies.length > 0;
    const sectionHeight = hasSupplies ? 120 + supplies.length * (cardHeight + 18) : 236;
    const outerPad = 18; // avoid touching page outer frame
    const shellX = x + outerPad;
    const shellY = y + 10;
    const shellW = width - outerPad * 2;
    const shellH = sectionHeight - 20;
    const shell = drawSectionShell(targetCtx, shellX, shellY, shellW, shellH, {});
    drawText(targetCtx, "已有补给", shellX + 26, shellY + 18, 22, THEME.ink, "700");
    drawText(targetCtx, "现在拥有的补给，可以回血，也能半价卖掉", shellX + 26, shellY + 46, 16, THEME.inkSoft, "600");
    let cursor = shellY + shell.barH + 20;
    if (!hasSupplies) {
      drawCard(targetCtx, shellX + 18, cursor, shellW - 36, 72, THEME.paper);
      drawText(targetCtx, "这里还没有补给，快去商店购买一些吧。", shellX + shellW / 2, cursor + 22, 22, THEME.inkSoft, "500", "center");
      return y + sectionHeight;
    }
    supplies.forEach(function (entry) {
      const item = entry.item;
      const count = entry.count;
      const textX = shellX + 158;
      const canUse = state.profile.hp < state.profile.maxHp && count > 0;
      drawCard(targetCtx, shellX + 18, cursor, shellW - 36, cardHeight, THEME.paper);
      drawSpriteFrame(targetCtx, getCatalogPreview(item, 48), shellX + 36, cursor + 18, 96, itemRarityFrameColor(item));
      const countText = "x" + count;
      const countSize = 18;
      const countWidth = measureStyledTextWidth(targetCtx, countText, countSize, "600", null);
      const titleRightLimit = shellX + shellW - 260;
      const nameMaxWidth = Math.max(120, titleRightLimit - textX - countWidth - 12);
      const nameSize = fitCanvasTextSize(item.name, nameMaxWidth, 28, "700", 18);
      const nameWidth = Math.min(nameMaxWidth, measureStyledTextWidth(targetCtx, item.name, nameSize, "700", null));
      drawText(targetCtx, item.name, textX, cursor + 26, nameSize, THEME.ink, "700");
      drawText(targetCtx, countText, Math.min(titleRightLimit - countWidth, textX + nameWidth + 12), cursor + 32, countSize, THEME.inkSoft, "600");
      drawTextFitted(targetCtx, "恢复 " + (item.hp || 0) + " HP", textX, cursor + 66, Math.max(240, shellW - 420), 20, THEME.inkSoft, "500", "left", 14);
      drawTextFitted(targetCtx, "卖掉可得 " + supplySellPrice(item) + " 金币", textX, cursor + 94, Math.max(220, shellW - 420), 18, THEME.inkSoft, "500", "left", 12);
      drawButton(targetCtx, shellX + shellW - 244, cursor + 24, 96, 68, canUse ? "使用" : "HP已满", canUse ? "yellow" : "disabled");
      drawButton(targetCtx, shellX + shellW - 136, cursor + 24, 96, 68, "卖掉", "red");
      if (canUse) registerRegion(mainRegions, shellX + shellW - 244, cursor + 24, 96, 68, function () { useSupply(item.id); });
      registerRegion(mainRegions, shellX + shellW - 136, cursor + 24, 96, 68, function () { sellSupply(item.id); });
      cursor += cardHeight + 18;
    });
    return y + sectionHeight;
  }

  function renderTasksPage(targetCtx, view, y) {
    const x = view.left;
    const w = view.contentWidth;
    const phoneReadable = view.width <= 560;
    const groups = groupedTasks();
    const orderedTodo = orderedTodoTasks(groups.todo);
    const visibleTodo = state.showCompletedTodo ? orderedTodo : orderedTodo.filter(function (task) { return !task.completed; });
    const hiddenCompletedCount = orderedTodo.length - visibleTodo.length;
    const doneTodoCount = completedTodoCount();
    const tab = state.tasksTab === "rest" ? "rest" : "challenge";
    const tabBarH = 106;
    const bucketHeadingOptions = phoneReadable ? {
      subtitleSize: 22,
      titleSize: 40,
      titleOffsetY: 42,
      headerHeight: 102
    } : null;
    const todoSectionOptions = {
      subtitleSize: bucketHeadingOptions && bucketHeadingOptions.subtitleSize,
      titleSize: bucketHeadingOptions && bucketHeadingOptions.titleSize,
      titleOffsetY: bucketHeadingOptions && bucketHeadingOptions.titleOffsetY,
      headerHeight: bucketHeadingOptions && bucketHeadingOptions.headerHeight,
      stackHeaderActions: phoneReadable,
      headerActions: [
        {
          label: state.todoSortMode === "deadline" ? "按默认排序" : "按截止日期排序",
          variant: "paper",
          width: 196,
          onClick: toggleTodoSortMode
        },
        {
          label: "一键删除已完成",
          variant: "red",
          width: 204,
          disabled: doneTodoCount <= 0,
          onClick: openDeleteCompletedTodoConfirm
        },
        {
          label: state.showCompletedTodo ? "隐藏已完成" : "显示已完成",
          variant: "paper",
          width: 172,
          onClick: function () {
            state.showCompletedTodo = !state.showCompletedTodo;
            saveState();
            renderApp();
          }
        }
      ],
      emptyText: hiddenCompletedCount > 0 ? "已完成待办已隐藏，可以点击右上角重新显示。" : "这里还没有待办，先加一个小目标吧。"
    };
    const challengeContentH = bucketSectionHeight(visibleTodo, todoSectionOptions, w - 60) + 16 + bucketSectionHeight(groups.habit, bucketHeadingOptions, w - 60) + 16 + bucketSectionHeight(groups.learn, bucketHeadingOptions, w - 60) + 40;
    const restContentH = (function () {
      const cardHeight = 132;
      const hasRewards = state.rewards.length > 0;
      const rewardsH = hasRewards ? 120 + state.rewards.length * (cardHeight + 18) : 236;
      const supplyCount = ownedSupplyItems().length;
      const suppliesH = supplyCount > 0 ? 120 + supplyCount * (cardHeight + 18) : 236;
      return rewardsH + 18 + suppliesH + 24;
    })();
    const sectionHeight = 86 + tabBarH + (tab === "challenge" ? challengeContentH : restContentH);
    drawPanel(targetCtx, x, y, w, sectionHeight, THEME.paper);
    drawSectionHeader(targetCtx, x + 30, y + 30, "任务区", tab === "challenge" ? "挑战列表" : "自定义奖励与已有补给", phoneReadable ? {
      smallWidth: 420,
      titleWidth: 760,
      smallSize: 18,
      smallMinSize: 14,
      titleSize: 36,
      titleMinSize: 22,
      titleOffsetY: 26
    } : null);

    // 分页条（挑战 / 休整） + 像素加号按钮
    const barY = y + 96;
    drawCard(targetCtx, x + 28, barY, w - 56, tabBarH, THEME.paper);
    const chipY = barY + 22;
    const chipH = 62;
    const chipW = 140;
    const chipGap = 14;
    const leftX = x + 46;
    drawButton(targetCtx, leftX, chipY, chipW, chipH, "挑战", tab === "challenge" ? "yellow" : "paper", { small: true, active: tab === "challenge", fontSize: 22 });
    drawButton(targetCtx, leftX + chipW + chipGap, chipY, chipW, chipH, "休整", tab === "rest" ? "yellow" : "paper", { small: true, active: tab === "rest", fontSize: 22 });
    registerRegion(mainRegions, leftX, chipY, chipW, chipH, function () { state.tasksTab = "challenge"; saveState(); renderApp(); });
    registerRegion(mainRegions, leftX + chipW + chipGap, chipY, chipW, chipH, function () { state.tasksTab = "rest"; saveState(); renderApp(); });

    const plusSize = 56;
    const plusPad = 14;
    const plusX = x + w - 56 - plusSize - plusPad;
    const plusY = chipY + (chipH - plusSize) / 2;
    drawCard(targetCtx, plusX, plusY, plusSize, plusSize, THEME.paper);
    targetCtx.strokeStyle = THEME.frameDark;
    targetCtx.lineWidth = 3;
    targetCtx.strokeRect(plusX + 3, plusY + 3, plusSize - 6, plusSize - 6);
    drawPixelPlusGlyph(targetCtx, plusX + 10, plusY + 10, plusSize - 20, THEME.ink);
    registerRegion(mainRegions, plusX, plusY, plusSize, plusSize, function () {
      if (tab === "challenge") openCreateChallengeModal();
      else openCreateRewardModal();
    }, { tooltip: tab === "challenge" ? "新建挑战" : "新建奖励" });

    let cursor = barY + tabBarH + 24;
    if (tab === "challenge") {
      cursor = renderBucketSection(targetCtx, x + 30, cursor, w - 60, "To do", "待办事项", visibleTodo, todoSectionOptions);
      cursor = renderBucketSection(targetCtx, x + 30, cursor + 16, w - 60, "Habit", "习惯养成", groups.habit, bucketHeadingOptions);
      cursor = renderBucketSection(targetCtx, x + 30, cursor + 16, w - 60, "Learn", "技能学习", groups.learn, bucketHeadingOptions);
      return cursor;
      cursor = renderBucketSection(targetCtx, x + 30, cursor, w - 60, "To do", "待办事项", visibleTodo, {
        subtitleSize: bucketHeadingOptions && bucketHeadingOptions.subtitleSize,
        titleSize: bucketHeadingOptions && bucketHeadingOptions.titleSize,
        titleOffsetY: bucketHeadingOptions && bucketHeadingOptions.titleOffsetY,
        headerHeight: bucketHeadingOptions && bucketHeadingOptions.headerHeight,
        headerActions: [
          {
            label: state.todoSortMode === "deadline" ? "按默认排序" : "按截止日期排序",
            variant: "paper",
            width: 196,
            onClick: toggleTodoSortMode
          },
          {
            label: "一键删除已完成",
            variant: "red",
            width: 204,
            disabled: doneTodoCount <= 0,
            onClick: openDeleteCompletedTodoConfirm
          },
          {
            label: state.showCompletedTodo ? "隐藏已完成" : "显示已完成",
            variant: "paper",
            width: 172,
            onClick: function () {
              state.showCompletedTodo = !state.showCompletedTodo;
              saveState();
              renderApp();
            }
          }
        ],
        emptyText: hiddenCompletedCount > 0 ? "已完成待办已隐藏，可以点击右上角重新显示。" : "这里还没有待办，先加一个小目标吧。"
      });
      cursor = renderBucketSection(targetCtx, x + 30, cursor + 16, w - 60, "Habit", "习惯养成", groups.habit, bucketHeadingOptions);
      cursor = renderBucketSection(targetCtx, x + 30, cursor + 16, w - 60, "Learn", "技能学习", groups.learn, bucketHeadingOptions);
      return cursor;
    }
    cursor = renderRewards(targetCtx, x, cursor, w);
    cursor = renderRest(targetCtx, x, cursor + 18, w);
    return cursor;
  }

  function renderShopPage(targetCtx, view, y) {
    const x = view.left;
    const w = view.contentWidth;
    const narrowLayout = w < 760;
    const categories = [["all", "全部"], ["background", "背景"], ["hair", "发型"], ["top", "上装"], ["bottom", "下装"], ["item", "装备"], ["accessory", "配饰"], ["supply", "补给"], ["petEgg", "宠物蛋"]];
    const items = SHOP_CATALOG.filter(function (item) {
      const visible = item.shopVisible !== false;
      if (!visible) return false;
      return state.shopCategory === "all" ? true : item.category === state.shopCategory;
    }).sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    const columns = narrowLayout ? 1 : (w > 980 ? 2 : 1);
    const rowsPerPage = narrowLayout ? 4 : 3;
    const itemsPerPage = columns * rowsPerPage;
    const maxPage = Math.max(0, Math.ceil(items.length / itemsPerPage) - 1);
    const currentPage = clamp(Number(state.shopPage) || 0, 0, maxPage);
    const startIndex = currentPage * itemsPerPage;
    const pageItems = items.slice(startIndex, startIndex + itemsPerPage);
    const tabY = y + 118;
    const tabCardH = narrowLayout ? 214 : 108;
    const cardH = narrowLayout ? 182 : 148;
    const cardPitch = cardH + 18;
    const gridY = tabY - 8 + tabCardH + 18;
    const sectionHeight = (gridY - y) + rowsPerPage * cardPitch + 80;
    drawPanel(targetCtx, x, y, w, sectionHeight, THEME.paper);
    drawSectionHeader(targetCtx, x + 30, y + 30, "像素商店", "冒险用品专卖");
    drawCard(targetCtx, x + 28, tabY - 8, w - 56, tabCardH, THEME.paper);
    if (narrowLayout) {
      const chipCols = 3;
      const chipGapX = 12;
      const chipGapY = 12;
      const chipW = Math.floor((w - 56 - 32 - chipGapX * (chipCols - 1)) / chipCols);
      const chipH = 56;
      categories.forEach(function (entry, index) {
        const row = Math.floor(index / chipCols);
        const col = index % chipCols;
        const btnX = x + 44 + col * (chipW + chipGapX);
        const btnY = tabY + 8 + row * (chipH + chipGapY);
        const disabled = state.pureMode;
        drawButton(targetCtx, btnX, btnY, chipW, chipH, entry[1], disabled ? "disabled" : (state.shopCategory === entry[0] ? "yellow" : "paper"), {
          small: true,
          fontSize: 22,
          minFontSize: 16,
          active: !disabled && state.shopCategory === entry[0],
          disabled: disabled
        });
        registerRegion(mainRegions, btnX, btnY, chipW, chipH, function () {
          if (state.pureMode) {
            setToast("纯净模式下，像素商店已锁定，请专注完成任务。", "info");
            renderApp();
            return;
          }
          state.shopCategory = entry[0];
          state.shopPage = 0;
          saveState();
          renderApp();
        });
      });
    } else {
      let tabX = x + 46;
      categories.forEach(function (entry) {
        const btnW = entry[1].length > 2 ? 86 : 72;
        const disabled = state.pureMode;
        drawButton(targetCtx, tabX, tabY + 10, btnW, 58, entry[1], disabled ? "disabled" : (state.shopCategory === entry[0] ? "yellow" : "paper"), { small: true, fontSize: 20, minFontSize: 14, active: !disabled && state.shopCategory === entry[0], disabled: disabled });
        registerRegion(mainRegions, tabX, tabY + 10, btnW, 58, function () {
          if (state.pureMode) {
            setToast("纯净模式下，像素商店已锁定，请专注完成任务。", "info");
            renderApp();
            return;
          }
          state.shopCategory = entry[0];
          state.shopPage = 0;
          saveState();
          renderApp();
        });
        tabX += btnW + 16;
      });
    }
    let cursor = gridY;
    pageItems.forEach(function (item, index) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const cardW = columns === 2 ? (w - 76) / 2 : w - 56;
      const cardX = x + 28 + col * (cardW + (columns === 2 ? 20 : 0));
      const cardY = cursor + row * cardPitch;
      drawCard(targetCtx, cardX, cardY, cardW, cardH, THEME.paper);
      if (narrowLayout) {
        const btnW = 128;
        const btnH = 74;
        const btnX = cardX + cardW - btnW - 18;
        const btnY = cardY + cardH - btnH - 18;
        drawSpriteFrame(targetCtx, getCatalogPreview(item, 48), cardX + 18, cardY + 18, 108, itemRarityFrameColor(item));
        const textX = cardX + 144;
        const titleMaxWidth = cardW - 162;
        const descMaxWidth = Math.max(150, btnX - textX - 12);
        drawText(targetCtx, CATEGORY_LABELS[item.category] + "  •  " + itemRarityLabel(item), textX, cardY + 20, 20, THEME.inkSoft, "500");
        drawTextFitted(targetCtx, item.name, textX, cardY + 54, titleMaxWidth, 30, THEME.ink, "700", "left", 18);
        drawParagraph(targetCtx, item.description, textX, cardY + 90, descMaxWidth, 18, THEME.inkSoft, 22, { maxLines: 2 });
        let label = [item.price + "金币", "购买"];
        let variant = "yellow";
        const requiredLevel = itemRequiredLevel(item);
        const heroLevel = state.profile.level || 1;
        if (isEquippedCatalogItem(item)) {
          if (item.category === "petEgg") label = "培养中";
          else if (item.category === "accessory" || item.category === "item") label = "取消装备";
          else label = "已装备";
        }
        else if (isOwnedCatalogItem(item)) label = item.category === "petEgg" ? "已拥有" : "装备";
        else if (heroLevel < requiredLevel) {
          label = ["Lv" + requiredLevel, "可购"];
          variant = "disabled";
        } else if (state.profile.gold < item.price) {
          variant = "disabled";
        }
        drawButton(targetCtx, btnX, btnY, btnW, btnH, label, variant, { small: true, disabled: variant === "disabled" });
        if (variant !== "disabled") registerRegion(mainRegions, btnX, btnY, btnW, btnH, function () { purchaseCatalog(item.id); });
        return;
      }
      const btnW = 120;
      const btnH = 68;
      const btnX = cardX + cardW - btnW - 18;
      const btnY = cardY + 38;
      drawSpriteFrame(targetCtx, getCatalogPreview(item, 48), cardX + 18, cardY + 22, 118, itemRarityFrameColor(item));
      const textX = cardX + 158;
      const titleMaxWidth = Math.max(120, btnX - textX - 20);
      const descMaxWidth = Math.max(160, cardW - (textX - cardX) - 28);
      drawText(targetCtx, CATEGORY_LABELS[item.category] + "  •  " + itemRarityLabel(item), textX, cardY + 22, 24, THEME.inkSoft, "500");
      drawTextFitted(targetCtx, item.name, textX, cardY + 76, titleMaxWidth, 28, THEME.ink, "700", "left", 16);
      drawParagraph(targetCtx, item.description, textX, cardY + 114, descMaxWidth, 20, THEME.inkSoft, 24, { maxLines: 1 });
      let label = [item.price + "金币", "购买"];
      let variant = "yellow";
      const requiredLevel = itemRequiredLevel(item);
      const heroLevel = state.profile.level || 1;
      if (isEquippedCatalogItem(item)) {
        if (item.category === "petEgg") label = "\u57f9\u517b\u4e2d";
        else if (item.category === "accessory") label = "\u53d6\u6d88\u88c5\u5907";
        else if (item.category === "item") label = "\u53d6\u6d88\u88c5\u5907";
        else label = "\u5df2\u88c5\u5907";
      }
      else if (isOwnedCatalogItem(item)) label = item.category === "petEgg" ? "已拥有" : "装备";
      else if (heroLevel < requiredLevel) {
        label = ["Lv" + requiredLevel, "可购"];
        variant = "disabled";
      } else if (state.profile.gold < item.price) {
        variant = "disabled";
      }
      drawButton(targetCtx, btnX, btnY, btnW, btnH, label, variant, { small: true, disabled: variant === "disabled" });
      if (variant !== "disabled") registerRegion(mainRegions, btnX, btnY, btnW, btnH, function () { purchaseCatalog(item.id); });
    });
    cursor += rowsPerPage * cardPitch;

    // 分页控件（仅在有多页时显示）
    if (maxPage > 0) {
      const pagerY = cursor + 8;
      const infoText = "第 " + (currentPage + 1) + " 页 / 共 " + (maxPage + 1) + " 页";
      drawText(targetCtx, infoText, x + w / 2, pagerY + 8, 16, THEME.inkSoft, "600", "center");
      const btnW = 80;
      const btnH = 40;
      const prevX = x + w / 2 - 120;
      const nextX = x + w / 2 + 40;
      const canPrev = currentPage > 0;
      const canNext = currentPage < maxPage;
      // 使用 pager / pagerDisabled 两种配色，禁用时不注册点击区域即可
      drawButton(targetCtx, prevX, pagerY + 24, btnW, btnH, "上一页", canPrev ? "pager" : "pagerDisabled", { small: true });
      drawButton(targetCtx, nextX, pagerY + 24, btnW, btnH, "下一页", canNext ? "pager" : "pagerDisabled", { small: true });
      if (canPrev) registerRegion(mainRegions, prevX, pagerY + 24, btnW, btnH, function () { state.shopPage = currentPage - 1; renderApp(); });
      if (canNext) registerRegion(mainRegions, nextX, pagerY + 24, btnW, btnH, function () { state.shopPage = currentPage + 1; renderApp(); });
      return pagerY + 24 + btnH + 24;
    }
    return y + sectionHeight;
  }

  function drawPetCareActionCard(targetCtx, x, y, width, option, enabled) {
    const barH = 52;
    drawCard(targetCtx, x, y, width, barH, THEME.paper);
    const pad = 14;
    const iconSize = 28;
    drawPetCareIcon(targetCtx, x + pad, y + (barH - iconSize) / 2, iconSize, option.icon);
    const col1 = x + pad + iconSize + 20;
    const col2 = x + pad + iconSize + 20 + 92;
    const col3 = x + pad + iconSize + 20 + 92 + 82;
    const textBaseline = y + barH / 2 + 3;
    const ink = enabled ? THEME.ink : THEME.inkSoft;
    drawText(targetCtx, option.name, col1, textBaseline, 16, ink, "600");
    drawText(targetCtx, option.price + " 金币", col2, textBaseline, 15, ink, "600");
    drawText(targetCtx, "+" + option.growth, col3, textBaseline, 15, ink, "600");
    if (!enabled) fillRect(targetCtx, x + 6, y + 6, width - 12, barH - 12, "#d7ceb2");
  }

  function renderPetsPage(targetCtx, view, y) {
    const x = view.left;
    const w = view.contentWidth;
    const narrowLayout = view.width <= 560;
    const pet = currentPet();
    const hasPets = state.pets.length > 0;
    const perRow = w > 1160 ? 2 : 1;
    const listRows = hasPets ? Math.ceil(state.pets.length / perRow) : 0;
    const showDisplaySelector = Boolean(hasPets && pet && !pet.isEgg && petDisplayFormOptions(pet).length > 1);
    const topCardHeight = !hasPets
      ? 226
      : (pet && pet.isEgg
        ? (narrowLayout ? 596 : 520)
        : (narrowLayout ? (showDisplaySelector ? 520 : 474) : 420));
    const sectionHeight = 140 + topCardHeight + (listRows ? 24 + listRows * 226 : 0);
    drawPanel(targetCtx, x, y, w, sectionHeight, THEME.paper);
    drawSectionHeader(targetCtx, x + 30, y + 30, "宠物中心", "培养你的像素宠物");
    drawCard(targetCtx, x + 28, y + 112, w - 56, topCardHeight, THEME.paper);
    if (!hasPets) {
      drawSpriteFrame(targetCtx, getEmptyPetSprite(72), x + 46, y + 120, 210);
      drawParagraph(targetCtx, "你还没有宠物，快去商店或冒险获得蛋来孵化吧！", x + 288, y + 152, w - 390, 24, THEME.inkSoft, 30, { maxLines: 3 });
      return y + sectionHeight;
    }
    const currentDisplayForm = petDisplayFormValue(pet);
    drawSpriteFrame(targetCtx, getPetSprite(pet, 72, currentDisplayForm), x + 46, y + 146, 210, petRarityFrameColor(pet));
    const petIntro = petIntroText(pet);
    if (petIntro) {
      // 字体参数与“心情简介(p2)”一致：14px + 行高 20，宽度不超过小图
      drawParagraph(targetCtx, petIntro, x + 46, y + 146 + 210 + 16, 210, 14, THEME.inkSoft, 20, { maxLines: 3 });
    }
    const detailTextX = x + 288;
    const detailTextW = Math.max(220, w - 390);
    const metaLine1Y = y + 208;
    const metaLine2Y = metaLine1Y + 28;
    const metaLine3Y = metaLine2Y + 28;
    const infoStartY = metaLine3Y + 38;
    drawTextFitted(targetCtx, petDisplayName(pet), detailTextX, y + 160, detailTextW, 28, THEME.ink, "700", "left", 18);
    drawTextFitted(targetCtx, "阶段：" + petStageLabel(pet), detailTextX, metaLine1Y, detailTextW, 18, THEME.inkSoft, "700", "left", 13);
    drawTextFitted(targetCtx, "来源：" + pet.source, detailTextX, metaLine2Y, detailTextW, 18, THEME.inkSoft, "700", "left", 13);
    drawTextFitted(targetCtx, "等级：" + petRarityLabel(pet), detailTextX, metaLine3Y, detailTextW, 18, THEME.inkSoft, "700", "left", 13);
    if (pet.isEgg) {
      const totalMinutes = petGrowthNeeded(pet);
      const progressValue = petGrowthValue(pet);
      const remainingMinutes = pet.incubationStartedAt && pet.incubationEndsAt ? Math.max(0, Math.ceil((pet.incubationEndsAt - Date.now()) / 60000)) : totalMinutes;
      const actionX = detailTextX;
      const actionW = 214;
      const actionH = 62;
      const actionGap = 14;
      const eggDescHeight = drawParagraph(
        targetCtx,
        pet.incubationStartedAt ? ("孵化已经开始啦，剩余约" + remainingMinutes + "分钟。") : ("这颗蛋需要" + totalMinutes + "分钟完成孵化，点击开始。"),
        detailTextX,
        infoStartY,
        detailTextW,
        18,
        THEME.inkSoft,
        22,
        { maxLines: 2 }
      );
      const meterY = infoStartY + eggDescHeight + 46;
      const actionY = meterY + 74;
      drawMeter(targetCtx, detailTextX, meterY, Math.min(420, detailTextW), progressValue, totalMinutes, [THEME.expA, THEME.expB], "孵化进度");
      drawButton(targetCtx, actionX, actionY, actionW, actionH, pet.incubationStartedAt ? "孵化中" : "开始孵化", pet.incubationStartedAt ? "disabled" : "green", { small: true, disabled: Boolean(pet.incubationStartedAt) });
      const hatchPrice = petInstantHatchCost(pet);
      drawButton(targetCtx, actionX, actionY + actionH + actionGap, actionW, actionH, "一键孵化（" + hatchPrice + "）", state.profile.gold >= hatchPrice ? "yellow" : "disabled", { small: true, disabled: state.profile.gold < hatchPrice });
      if (!pet.incubationStartedAt) registerRegion(mainRegions, actionX, actionY, actionW, actionH, startPetIncubation);
      if (state.profile.gold >= hatchPrice) registerRegion(mainRegions, actionX, actionY + actionH + actionGap, actionW, actionH, instantHatchPet);
    } else {
      const growthNeed = petGrowthNeeded(pet);
      const growthValue = petGrowthValue(pet);
      let descY = infoStartY;
      if (showDisplaySelector) {
        const selectorY = infoStartY;
        drawText(targetCtx, "展示形态", detailTextX, selectorY, 18, THEME.inkSoft, "500");
        const options = petDisplayFormOptions(pet);
        let chipX = detailTextX;
        let chipY = selectorY + 28;
        let selectorBottomY = chipY + 46;
        const chipGap = 12;
        const selectorRightLimit = x + w - 46;
        options.forEach(function (option) {
          const label = petDisplayFormLabel(pet, option);
          const chipW = Math.max(76, Math.min(108, measureStyledTextWidth(targetCtx, label, 16, "600", null) + 30));
          if (chipX + chipW > selectorRightLimit && chipX > detailTextX) {
            chipX = detailTextX;
            chipY += 58;
          }
          const active = String(currentDisplayForm) === String(option);
          drawButton(targetCtx, chipX, chipY, chipW, 46, label, active ? "green" : "paper", { small: true, active: active, disabled: active });
          if (!active) registerRegion(mainRegions, chipX, chipY, chipW, 46, function () { setCurrentPetDisplayForm(option); });
          selectorBottomY = Math.max(selectorBottomY, chipY + 46);
          chipX += chipW + chipGap;
        });
        descY = selectorBottomY + 28;
      }
      const barsWidth = narrowLayout ? 0 : 300;
      const barsGap = 10;
      const descMeterWidth = narrowLayout
        ? Math.max(220, w - 344)
        : Math.max(240, Math.min(420, detailTextW));
      const barsLeft = detailTextX + descMeterWidth + 40;
      const barsWidthActual = Math.min(barsWidth, w - 28 - (barsLeft - x) - 28);
      const descHeight = drawParagraph(targetCtx, pet.stage >= PET_STAGES.length - 1 ? "它已经成长为完全体啦，可以继续陪你一起冒险。" : "抚摸、喂食或成长药水都能推动成长条，越贵效果越强。", detailTextX, descY, descMeterWidth, 18, THEME.inkSoft, 22, { maxLines: 3 });
      const meterY = descY + descHeight + 44;
      drawMeter(targetCtx, detailTextX, meterY, descMeterWidth, growthValue, Math.max(1, growthNeed), [THEME.hpA, THEME.hpB], "成长条");
      if (pet.stage < PET_STAGES.length - 1) {
        if (narrowLayout) {
          const actionY = meterY + 52;
          const actionGap = 12;
          const actionWidth = Math.floor((Math.max(220, w - 344) - actionGap * 2) / 3);
          PET_CARE_OPTIONS.forEach(function (option, index) {
            const enabled = state.profile.gold >= option.price;
            const actionX = x + 288 + index * (actionWidth + actionGap);
            const variant = index === 0 ? "green" : (index === 1 ? "yellow" : "lilac");
            drawButton(targetCtx, actionX, actionY, actionWidth, 66, [option.name, option.price + "金币"], enabled ? variant : "disabled", {
              small: true,
              disabled: !enabled,
              fontSize: 16,
              minFontSize: 10
            });
            if (enabled) registerRegion(mainRegions, actionX, actionY, actionWidth, 66, function () { carePet(option.id); });
          });
        } else {
          const firstBarY = y + 194;
          PET_CARE_OPTIONS.forEach(function (option, index) {
            const actionY = firstBarY + index * (52 + barsGap);
            const enabled = state.profile.gold >= option.price;
            drawPetCareActionCard(targetCtx, barsLeft, actionY, barsWidthActual, option, enabled);
            if (enabled) registerRegion(mainRegions, barsLeft, actionY, barsWidthActual, 52, function () { carePet(option.id); });
          });
        }
      }
    }
    const cardW = perRow === 2 ? (w - 68) / 2 : w - 56;
    state.pets.forEach(function (entry, index) {
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      const cardX = x + 28 + col * (cardW + 12);
      const cardY = y + 136 + topCardHeight + 24 + row * 226;
      drawCard(targetCtx, cardX, cardY, cardW, 214, THEME.paper);
      drawSpriteFrame(targetCtx, getPetSprite(entry, 48), cardX + 22, cardY + 24, 124, petRarityFrameColor(entry));
      drawTextFitted(targetCtx, petDisplayName(entry), cardX + 170, cardY + 32, cardW - 330, 26, THEME.ink, "700", "left", 18);
      drawParagraph(targetCtx, "阶段： " + petStageLabel(entry) + "  •  来源： " + entry.source + "  •  等级： " + petRarityLabel(entry), cardX + 170, cardY + 100, cardW - 330, 18, THEME.inkSoft, 22, { maxLines: 2, weight: "700" });
      const active = entry.id === state.currentPetId;
      drawButton(targetCtx, cardX + cardW - 146, cardY + 54, 110, 72, active ? "培养中" : "设为培养", active ? "green" : "yellow", { small: true });
      if (!active) registerRegion(mainRegions, cardX + cardW - 146, cardY + 54, 110, 72, function () { setFollowPet(entry.id); });
    });
    return y + sectionHeight;
  }

  function renderCompanionPage(targetCtx, view, y) {
    const x = view.left;
    const w = view.contentWidth;
    const compact = view.width <= 560;
    const stripX = x + 28;
    const stripY = y + 28;
    const stripW = w - 56;
    const stripH = compact ? 126 : 116;
    const detailX = stripX;
    const detailY = stripY + stripH + 16;
    const detailW = stripW;
    const detailH = clamp(Math.round(detailW * (compact ? 0.96 : 0.84)), compact ? 560 : 460, compact ? 720 : 620);
    const panelHeight = (detailY - y) + detailH + 28;
    drawPanel(targetCtx, x, y, w, panelHeight, THEME.paper);
    drawCard(targetCtx, stripX, stripY, stripW, stripH, THEME.paper);
    drawCard(targetCtx, detailX, detailY, detailW, detailH, THEME.paper);

    const selected = selectedCompanion();
    const selectedIndex = Math.max(0, COMPANIONS.findIndex(function (companion) {
      return selected && companion.id === selected.id;
    }));
    const axisViewportX = stripX + 12;
    const axisViewportY = stripY + 14;
    const axisViewportW = stripW - 24;
    const axisViewportH = stripH - 42;
    const axisCardH = compact ? 48 : 46;
    const axisCardGap = 10;
    const axisCardFontSize = compact ? 14 : 15;
    const axisItems = [];
    let axisCursorX = 0;
    COMPANIONS.forEach(function (companion) {
      const record = activeCompanionRecord(companion.id);
      const unlocked = record.unlocked;
      const label = unlocked ? companion.name : "\uFF1F\uFF1F\uFF1F";
      const axisCardW = clamp(
        Math.round(measureStyledTextWidth(targetCtx, label, axisCardFontSize, "700", null) + (compact ? 40 : 46)),
        compact ? 92 : 104,
        compact ? 148 : 168
      );
      axisItems.push({
        companion: companion,
        record: record,
        unlocked: unlocked,
        label: label,
        width: axisCardW,
        start: axisCursorX
      });
      axisCursorX += axisCardW + axisCardGap;
    });
    const axisContentW = Math.max(0, axisCursorX - axisCardGap);
    const axisMaxScroll = Math.max(0, axisContentW - axisViewportW);
    let axisScroll = clamp(Number(state.companionStripScroll) || 0, 0, axisMaxScroll);
    const selectedAxisItem = axisItems[selectedIndex] || axisItems[0] || null;
    const selectedCompanionId = selected ? selected.id : null;
    const selectedCardStart = selectedAxisItem ? selectedAxisItem.start : 0;
    const selectedCardEnd = selectedAxisItem ? (selectedAxisItem.start + selectedAxisItem.width) : 0;
    if (selectedAxisItem && selectedCompanionId !== lastRenderedSelectedCompanionId && (selectedCardStart < axisScroll || selectedCardEnd > axisScroll + axisViewportW)) {
      axisScroll = clamp(selectedCardStart - Math.max(0, (axisViewportW - selectedAxisItem.width) / 2), 0, axisMaxScroll);
    }
    state.companionStripScroll = axisScroll;
    lastRenderedSelectedCompanionId = selectedCompanionId;

    drawCard(targetCtx, axisViewportX - 6, axisViewportY - 6, axisViewportW + 12, axisViewportH + 12, THEME.paperSoft);

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(axisViewportX, axisViewportY, axisViewportW, axisViewportH);
    targetCtx.clip();
    axisItems.forEach(function (item) {
      const active = selected && selected.id === item.companion.id;
      const cardX = axisViewportX - axisScroll + item.start;
      const cardY = axisViewportY + Math.max(0, Math.round((axisViewportH - axisCardH) / 2));
      const labelSize = fitCanvasTextSize(item.label, item.width - 20, 22, "700", axisCardFontSize);
      if (cardX + item.width < axisViewportX - 12 || cardX > axisViewportX + axisViewportW + 12) return;
      drawCard(targetCtx, cardX, cardY, item.width, axisCardH, active ? THEME.paperSoft : THEME.paper);
      if (active) {
        targetCtx.strokeStyle = "#fff7d3";
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(cardX + 6, cardY + 6, item.width - 12, axisCardH - 12);
      }
      drawTextFitted(
        targetCtx,
        item.label,
        cardX + item.width / 2,
        cardY + Math.max(1, Math.round((axisCardH - labelSize) / 2) - 1),
        item.width - 20,
        labelSize,
        item.unlocked ? (active ? THEME.ink : THEME.inkSoft) : THEME.inkSoft,
        "700",
        "center"
      );
      const visibleX = Math.max(cardX, axisViewportX);
      const visibleW = Math.min(cardX + item.width, axisViewportX + axisViewportW) - visibleX;
      if (visibleW > 0) registerRegion(mainRegions, visibleX, cardY, visibleW, axisCardH, function () { selectCompanion(item.companion.id); });
    });
    targetCtx.restore();

    const axisRailX = axisViewportX;
    const axisRailY = stripY + stripH - 24;
    const axisRailW = axisViewportW;
    const axisThumbW = axisMaxScroll > 0 ? Math.max(72, Math.round(axisRailW * (axisViewportW / axisContentW))) : axisRailW;
    const axisThumbX = axisMaxScroll > 0
      ? (axisRailX + Math.round((axisRailW - axisThumbW) * (axisScroll / axisMaxScroll)))
      : axisRailX;
    fillRect(targetCtx, axisRailX, axisRailY + 3, axisRailW, 8, THEME.frameDark);
    fillRect(targetCtx, axisRailX + 2, axisRailY + 5, axisRailW - 4, 4, THEME.paperMuted || "#d7ceb2");
    fillRect(targetCtx, axisThumbX, axisRailY, axisThumbW, 14, THEME.expA);
    targetCtx.strokeStyle = THEME.black;
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(axisThumbX, axisRailY, axisThumbW, 14);
    companionStripLayout = {
      area: { x: stripX, y: stripY, width: stripW, height: stripH },
      maxScroll: axisMaxScroll
    };

    if (!selected) return y + panelHeight;
    const record = activeCompanionRecord(selected.id);
    const unlocked = record.unlocked;
    const detailSprite = unlocked
      ? getCompanionPortraitSceneSprite(selected, 120)
      : getTreasureSprite(120);
    const detailPad = compact ? 24 : 28;
    const visualW = Math.max(220, Math.min(310, Math.round(detailW * 0.34)));
    const visualX = detailX + detailPad;
    const visualY = detailY + detailPad;
    const infoGap = 18;
    const infoX = detailX + visualW + detailPad + infoGap;
    const infoY = detailY + detailPad;
    const infoW = detailW - visualW - detailPad * 2 - infoGap;
    const portraitSize = Math.min(Math.round(visualW * 0.72), detailH - 176, compact ? 236 : 250);
    const portraitX = visualX + Math.max(0, (visualW - portraitSize) / 2);
    const portraitY = visualY + 8;
    const portraitNameY = portraitY + portraitSize + 30;
    const portraitGiftW = Math.min(164, Math.max(124, visualW - 30));
    const portraitGiftX = visualX + Math.max(0, (visualW - portraitGiftW) / 2);
    const portraitGiftY = portraitNameY + 54;
    drawSpriteFrame(targetCtx, detailSprite, portraitX, portraitY, portraitSize);
    drawTextFitted(targetCtx, unlocked ? selected.name : "\uFF1F\uFF1F\uFF1F", visualX + visualW / 2, portraitNameY, visualW - 16, 28, THEME.ink, "700", "center", 16);
    drawButton(targetCtx, portraitGiftX, portraitGiftY, portraitGiftW, 56, "\u9001\u793c", unlocked ? "green" : "disabled", { small: true, disabled: !unlocked, fontSize: 18, minFontSize: 14 });
    if (unlocked) registerRegion(mainRegions, portraitGiftX, portraitGiftY, portraitGiftW, 56, function () { openCompanionGiftShop(selected.id); });

    drawText(targetCtx, unlocked ? "\u4f19\u4f34\u7b80\u4ecb" : "\u5c1a\u672a\u89e3\u9501", infoX, infoY + 4, 18, THEME.inkSoft, "600");
    const introText = unlocked
      ? selected.intro
      : "\u8fd9\u4f4d\u4f19\u4f34\u8fd8\u6ca1\u6709\u6b63\u5f0f\u8ba4\u8bc6\u4f60\u3002\u53bb\u5192\u9669\u9875\u5bf9\u5e94\u7684\u573a\u666f\u591a\u8d70\u8d70\uff0c\u4e5f\u8bb8\u4e0b\u4e00\u6b21\u5c31\u4f1a\u9047\u89c1\u3002";
    let infoCursorY = infoY + 34;
    const introHeight = drawParagraph(targetCtx, introText, infoX, infoCursorY, infoW, 17, THEME.inkSoft, 22, { maxLines: compact ? 5 : 6 });
    infoCursorY += introHeight + 24;

    const affinityMeta = companionAffinityMeta(record.affection);
    drawText(
      targetCtx,
      unlocked ? ("\u597d\u611f Lv." + affinityMeta.level + " \u00b7 " + affinityMeta.name) : "\u597d\u611f\u4fe1\u606f\u5f85\u89e3\u9501",
      infoX,
      infoCursorY,
      22,
      THEME.ink,
      "700"
    );
    drawMeter(
      targetCtx,
      infoX,
      infoCursorY + 30,
      infoW,
      affinityMeta.progressValue,
      affinityMeta.progressMax,
      [THEME.expA, THEME.expB],
      ""
    );
    infoCursorY += 86;

    function drawCompanionMetaCard(cardX, cardY, cardW, label, value, maxLines, tall) {
      const lineLimit = maxLines || 2;
      const cardH = tall ? 82 : 64;
      drawCard(targetCtx, cardX, cardY, cardW, cardH, THEME.paperSoft);
      drawText(targetCtx, label, cardX + 14, cardY + 12, 14, THEME.inkSoft, "600");
      drawParagraph(targetCtx, value || "\u2014", cardX + 14, cardY + 34, cardW - 28, 14, THEME.ink, 18, { maxLines: lineLimit, weight: "600" });
      return cardH;
    }

    const locationText = unlocked ? companionDisplayLocationNames(selected, record.knownLocationIds) : "\u89e3\u9501\u540e\u663e\u793a";
    const preferenceText = unlocked
      ? ("\u559c\u6b22\uff1a" + companionDisplayGiftName(companionFavoriteGiftIds(selected), record.knownFavoriteIds) + " / \u8ba8\u538c\uff1a" + companionDisplayGiftName(companionDislikedGiftIds(selected), record.knownDislikedIds))
      : "\u89e3\u9501\u540e\u4f1a\u663e\u793a\u793c\u7269\u504f\u597d";
    const metaGap = 14;
    drawCompanionMetaCard(infoX, infoCursorY, infoW, "\u51fa\u6ca1\u5730\u70b9", locationText, 2, true);
    infoCursorY += 82 + metaGap;
    drawCompanionMetaCard(infoX, infoCursorY, infoW, "\u793c\u7269\u504f\u597d", preferenceText, compact ? 3 : 2, true);
    infoCursorY += 82 + metaGap;

    const bottomGap = 14;
    const statW = Math.max(110, Math.floor((infoW - bottomGap) / 2));
    const statY = Math.min(infoCursorY, detailY + detailH - 78);
    drawCompanionMetaCard(infoX, statY, statW, "\u89c1\u9762\u6b21\u6570", String(record.meetings) + " \u6b21", 1, false);
    drawCompanionMetaCard(infoX + statW + bottomGap, statY, statW, "\u4e0a\u6b21\u89c1\u9762", formatRelativeTimeFromNow(record.lastMetAt, "\u8fd8\u6ca1\u89c1\u8fc7\u9762"), 1, false);
    return y + panelHeight;
  }

  function renderSocialPage(targetCtx, view, y) {
    const x = view.left;
    const w = view.contentWidth;
    const tab = state.socialTab === SOCIAL_TABS.companions ? SOCIAL_TABS.companions : SOCIAL_TABS.pets;
    const headerHeight = 176;
    drawPanel(targetCtx, x, y, w, headerHeight, THEME.paper);
    drawSectionHeader(targetCtx, x + 30, y + 30, "社交页", tab === SOCIAL_TABS.pets ? "宠物与伙伴" : "在旅途中结识的伙伴");
    drawCard(targetCtx, x + 28, y + 104, w - 56, 58, THEME.paper);
    const chipY = y + 112;
    const chipW = 160;
    const chipH = 42;
    const chipGap = 14;
    const leftX = x + 46;
    drawButton(targetCtx, leftX, chipY, chipW, chipH, "宠物", tab === SOCIAL_TABS.pets ? "yellow" : "paper", { small: true, active: tab === SOCIAL_TABS.pets, fontSize: 22 });
    drawButton(targetCtx, leftX + chipW + chipGap, chipY, chipW, chipH, "伙伴", tab === SOCIAL_TABS.companions ? "yellow" : "paper", { small: true, active: tab === SOCIAL_TABS.companions, fontSize: 22 });
    registerRegion(mainRegions, leftX, chipY, chipW, chipH, function () { setSocialTab(SOCIAL_TABS.pets); });
    registerRegion(mainRegions, leftX + chipW + chipGap, chipY, chipW, chipH, function () { setSocialTab(SOCIAL_TABS.companions); });
    const contentY = y + headerHeight + 18;
    return tab === SOCIAL_TABS.pets ? renderPetsPage(targetCtx, view, contentY) : renderCompanionPage(targetCtx, view, contentY);
  }

  function renderAdventurePage(targetCtx, view, y) {
    const x = view.left;
    const w = view.contentWidth;
    const columns = w > 1180 ? 2 : 1;
    const trip = currentAdventureTrip();
    const cardW = columns === 2 ? (w - 76) / 2 : w - 56;
    const rows = Math.ceil(ADVENTURE_LOCATIONS.length / columns);
    const progressCardH = 330;
    const locationCardH = columns === 2 ? 248 : 276;
    const locationRowGap = 18;
    const progressY = y + 96;
    const locationsTopY = progressY + progressCardH + 24;
    const sectionHeight = (locationsTopY - y) + Math.max(0, rows - 1) * (locationCardH + locationRowGap) + locationCardH + 28;
    drawPanel(targetCtx, x, y, w, sectionHeight, THEME.paper);
    drawSectionHeader(targetCtx, x + 30, y + 30, "探索地图", "冒险区域");
    ADVENTURE_LOCATIONS.forEach(function (location, index) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const cardX = x + 28 + col * (cardW + 20);
      const cardY = locationsTopY + row * (locationCardH + locationRowGap);
      const spriteSize = columns === 2 ? 118 : 110;
      const textX = cardX + spriteSize + 42;
      const textWidth = Math.max(150, cardW - (textX - cardX) - 24);
      const descLineHeight = 22;
      drawCard(targetCtx, cardX, cardY, cardW, locationCardH, THEME.paper);
      drawSpriteFrame(targetCtx, getSceneSprite(location.scene, 48), cardX + 20, cardY + 20, spriteSize);
      drawTextFitted(targetCtx, location.name, textX, cardY + 24, textWidth, 24, THEME.ink, "700", "left", 18);
      drawTextFitted(targetCtx, "消耗 " + location.cost + " 冒险槽 · 耗时 " + location.minutes + " 分钟", textX, cardY + 60, textWidth, 16, THEME.inkSoft, "600", "left", 12);
      drawParagraph(targetCtx, location.desc, textX, cardY + 92, textWidth, 16, THEME.inkSoft, descLineHeight, { maxLines: columns === 2 ? 3 : 4 });
      const unlockLevel = Math.max(1, Number(location.unlockLevel) || 1);
      const unlocked = (state.profile.level || 1) >= unlockLevel;
      const canGo = unlocked && state.adventure.slots >= location.cost && (!trip || isAdventureTripReady(trip));
      const buttonLabel = unlocked ? ("出发（" + location.cost + "）") : ("达到 Lv" + unlockLevel + " 解锁");
      const miniCost = Math.max(1, Math.ceil((Number(location.cost) || 1) / 2));
      const canPlay = unlocked && state.adventure.slots >= miniCost;
      const miniLabel = unlocked ? ("小游戏（" + miniCost + "）") : ("达到 Lv" + unlockLevel + " 解锁");
      const actionGap = 14;
      const actionW = Math.floor((cardW - 44 - actionGap) / 2);
      const actionY = cardY + locationCardH - 72;
      const goX = cardX + 22;
      const miniX = goX + actionW + actionGap;
      drawButton(targetCtx, goX, actionY, actionW, 52, buttonLabel, canGo ? "paper" : "disabled", { small: true, disabled: !canGo });
      drawButton(targetCtx, miniX, actionY, actionW, 52, miniLabel, canPlay ? "yellow" : "disabled", { small: true, disabled: !canPlay });
      if (canGo) registerRegion(mainRegions, goX, actionY, actionW, 52, function () { startAdventure(location.id); });
      if (canPlay) registerRegion(mainRegions, miniX, actionY, actionW, 52, function () { openFlappyForLocation(location.id); });
    });
    drawCard(targetCtx, x + 28, progressY, w - 56, progressCardH, THEME.paper);
    drawSectionHeader(targetCtx, x + 54, progressY + 20, "冒险进度", "当前冒险槽");
    drawMeter(targetCtx, x + 54, progressY + 134, w - 108, state.adventure.slots, state.adventure.maxSlots, ["#8adce9", "#d9cfab"], "槽位");
    if (trip) {
      const remaining = Math.max(0, Math.ceil((trip.endsAt - Date.now()) / 1000));
      const ready = remaining === 0;
      const infoWidth = w - 108;
      drawTextFitted(targetCtx, ready ? "当前冒险已结束，可以领取战利品。" : "正在探索： " + trip.locationName, x + 54, progressY + 184, infoWidth, 20, THEME.ink, "600", "left", 14);
      drawTextFitted(targetCtx, ready ? "战利品已经准备好了。" : "剩余时间： " + formatClock(remaining), x + 54, progressY + 216, infoWidth, 18, THEME.inkSoft, "500", "left", 14);
      const actionButtonGap = 16;
      const actionButtonH = 56;
      const actionButtonY = progressY + 248;
      if (!ready) {
        const actionButtonW = Math.min(184, Math.floor((w - 140 - actionButtonGap) / 2));
        const skipCost = adventureSkipCost(trip);
        const canSkip = state.profile.gold >= skipCost;
        const totalActionW = actionButtonW * 2 + actionButtonGap;
        const skipButtonX = x + w / 2 - totalActionW / 2;
        const statusButtonX = skipButtonX + actionButtonW + actionButtonGap;
        drawButton(targetCtx, skipButtonX, actionButtonY, actionButtonW, actionButtonH, "跳过（" + skipCost + "金币）", canSkip ? "yellow" : "disabled", { small: true, disabled: !canSkip });
        drawButton(targetCtx, statusButtonX, actionButtonY, actionButtonW, actionButtonH, "冒险进行中", "disabled", { small: true, disabled: true });
        if (canSkip) registerRegion(mainRegions, skipButtonX, actionButtonY, actionButtonW, actionButtonH, skipAdventure);
      } else {
        const readyButtonW = 184;
        const readyButtonX = x + w / 2 - readyButtonW / 2;
        drawButton(targetCtx, readyButtonX, actionButtonY, readyButtonW, actionButtonH, "领取战利品", "yellow", { small: true });
        registerRegion(mainRegions, readyButtonX, actionButtonY, readyButtonW, actionButtonH, collectAdventure);
      }
    } else {
      drawTextFitted(targetCtx, "当前没有进行中的冒险。完成任务积累冒险槽后就能出发。", x + w / 2, progressY + 212, w - 180, 20, THEME.inkSoft, "500", "center", 14);
    }
    return y + sectionHeight;
  }

  function renderJournalPage(targetCtx, view, y) {
    const x = view.left;
    const w = view.contentWidth;
    const columns = w > 1280 ? 6 : w > 980 ? 3 : 2;
    const gap = 18;
    const cardW = (w - 60 - gap * (columns - 1)) / columns;
    const rows = Math.ceil(6 / columns);
    const statBoxHeight = rows * 126 + (rows - 1) * gap;
    const logMetrics = state.logs.map(function (log) {
      const lineCount = Math.max(1, Math.min(wrapLines(ctx, log.message, w - 260, 18, "500").length, 3));
      return { height: Math.max(94, 34 + lineCount * 28), lines: lineCount };
    });
    const logsContentHeight = logMetrics.length
      ? logMetrics.reduce(function (sum, metric) { return sum + metric.height + 14; }, 0)
      : 108;
    // 日志区域顶部还有 48px 预留空间（标题到第一条日志），需要计入面板总高度
    const logsHeight = logsContentHeight + 48;
    const previewGap = 16;
    const previewW = Math.min(160, (w - 60 - previewGap * 5) / 6);
    const previewH = previewW + 34;
    const signHeight = 52;
    const historyHeight = 340;
    const codexHeight = 46 + previewH + 36;
    const achievementHeight = 46 + previewH + 36;
    const panelHeight = 210 + statBoxHeight + signHeight + historyHeight + codexHeight + achievementHeight + logsHeight;
    drawPanel(targetCtx, x, y, w, panelHeight, THEME.paper);
    drawSectionHeader(targetCtx, x + 30, y + 30, "今日统计", "今天打了多少经验");
    [["TODAY EXP", state.todayStats.exp], ["DONE", state.todayStats.done], ["POMO", state.todayStats.pomo], ["GOLD +", state.todayStats.goldIn], ["GOLD -", state.todayStats.goldOut], ["TRIPS", state.todayStats.trips]].forEach(function (entry, index) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      drawStatBox(targetCtx, x + 30 + col * (cardW + gap), y + 106 + row * (126 + gap), cardW, 126, entry[0], entry[1]);
    });
    // 签到行：已连续打卡 X 天 + 今日签到按钮
    const signY = y + 116 + statBoxHeight - 6;
    const streakDays = state.profile.streak || 0;
    const signedIn = !!state.todaySignedIn;
    const canSign = !signedIn && state.todayStats.done > 0;
    const signLabel = signedIn ? "今日已签到" : "签到领金币";
    drawText(targetCtx, "已连续打卡 " + streakDays + " 天", x + 30, signY + 30, 22, THEME.frame, "700");
    const signBtnW = 160;
    const signBtnX = x + w - 30 - signBtnW;
    drawButton(targetCtx, signBtnX, signY + 10, signBtnW, 40, signLabel, canSign ? "yellow" : "disabled", { small: true, disabled: !canSign });
    if (canSign) {
      registerRegion(mainRegions, signBtnX, signY + 10, signBtnW, 40, signInToday);
    } else if (!signedIn) {
      registerRegion(mainRegions, signBtnX, signY + 10, signBtnW, 40, function () {
        setModal({ type: "hpWarning", reason: "signIn" });
      });
    }
    // 历史统计：月度 XP 热力图
    const historyStartY = signY + signHeight + 70;
    const historyMonthOffset = Math.max(0, Math.floor(Number(state.journalHistoryMonthOffset) || 0));
    const historyMonthDate = selectedJournalHistoryMonthDate();
    const historyMonthLabel = selectedJournalHistoryMonthLabel();
    drawSectionHeader(targetCtx, x + 30, historyStartY - 12, "历史统计", historyMonthOffset > 0 ? "冒险足迹" : "本月冒险足迹");
    const monthArrowSize = 28;
    const monthGap = 12;
    const monthLabelW = 148;
    const monthControlY = historyStartY + 10;
    const nextMonthDisabled = historyMonthOffset <= 0;
    const nextMonthX = x + w - 30 - monthArrowSize;
    const monthLabelX = nextMonthX - monthGap - monthLabelW;
    const prevMonthX = monthLabelX - monthGap - monthArrowSize;
    drawPixelTriangleGlyph(targetCtx, prevMonthX, monthControlY, monthArrowSize, "left", THEME.yellow, null);
    drawTextFitted(targetCtx, historyMonthLabel, monthLabelX + monthLabelW / 2, monthControlY + 2, monthLabelW, 22, THEME.inkSoft, "600", "center", 14);
    drawPixelTriangleGlyph(
      targetCtx,
      nextMonthX,
      monthControlY,
      monthArrowSize,
      "right",
      nextMonthDisabled ? THEME.paperMuted : THEME.yellow,
      null
    );
    registerRegion(mainRegions, prevMonthX, monthControlY, monthArrowSize, monthArrowSize, function () { shiftJournalHistoryMonth(1); });
    if (!nextMonthDisabled) registerRegion(mainRegions, nextMonthX, monthControlY, monthArrowSize, monthArrowSize, function () { shiftJournalHistoryMonth(-1); });
    const historyChartX = x + 30;
    const historyChartW = w - 60;
    const heatTop = historyStartY + 62;
    const cols = 7;
    const colGap = 4;
    const rowGap = 4;
    const marginX = 12;
    const usableW = historyChartW - marginX * 2;
    const cellW = Math.floor((usableW - colGap * (cols - 1)) / cols);
    const cellH = 30;

    const realToday = new Date();
    const year = historyMonthDate.getFullYear();
    const month = historyMonthDate.getMonth(); // 0-11
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const isCurrentMonth = year === realToday.getFullYear() && month === realToday.getMonth();
    const todayDay = isCurrentMonth ? Math.min(realToday.getDate(), daysInMonth) : daysInMonth;

    // 以周一为一周的第一天
    function weekdayIndex(d) {
      const jsDay = d.getDay(); // 0 (Sun) - 6 (Sat)
      return (jsDay + 6) % 7; // 0 (Mon) - 6 (Sun)
    }

    const history = state.historyStats || {};

    // 先求当月最大 EXP，用于着色
    let monthExpMax = 0;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = dayKey(date);
      const entry = history[key] || {};
      const expValue = Number(entry.exp) || 0;
      if (expValue > monthExpMax) monthExpMax = expValue;
    }

    const firstDayIndex = weekdayIndex(new Date(year, month, 1));
    const totalWeeks = Math.ceil((firstDayIndex + daysInMonth) / 7);

    // 整个热力图外框（双层边框，风格参考图鉴）
    const gridHeight = totalWeeks * (cellH + rowGap) - rowGap + 32;
    const outerX = historyChartX + 4; // 再左右各向内收一圈
    const outerY = heatTop - 8;
    const outerW = historyChartW - 8;
    const outerH = gridHeight + 8;
    // 外层深色边
    targetCtx.strokeStyle = THEME.frame;
    targetCtx.lineWidth = 4;
    targetCtx.strokeRect(outerX, outerY, outerW, outerH);
    // 内层浅色边
    const innerX = historyChartX + 8;
    const innerY = heatTop - 4;
    const innerW = historyChartW - 16;
    const innerH = gridHeight;
    targetCtx.strokeStyle = THEME.frameLight;
    targetCtx.lineWidth = 3;
    targetCtx.strokeRect(innerX, innerY, innerW, innerH);

    const weekdayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    // 顶部画星期标签
    weekdayLabels.forEach(function (label, col) {
      const tx = historyChartX + marginX + col * (cellW + colGap) + 2;
      const ty = heatTop - 5; // 再整体下移 5 像素
      drawPixelText(targetCtx, label, tx, ty, 12, THEME.ink, "bold");
    });

    // 热力图格子（包含当月前后补齐的空心格）
    for (let week = 0; week < totalWeeks; week += 1) {
      for (let col = 0; col < cols; col += 1) {
        const day = week * 7 + col - firstDayIndex + 1;
        const cx = historyChartX + marginX + col * (cellW + colGap);
        const cy = heatTop + 19 + week * (cellH + rowGap); // 在此基础上再下移 5 像素

        // 不属于本月的日期：只画空心矩形
        if (day < 1 || day > daysInMonth) {
          targetCtx.strokeStyle = THEME.paperMuted;
          targetCtx.lineWidth = 1;
          targetCtx.strokeRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1);
          continue;
        }

        const date = new Date(year, month, day);
        const key = dayKey(date);
        const entry = history[key] || { exp: 0, done: 0 };
        const expValue = Number(entry.exp) || 0;
        const doneValue = Number(entry.done) || 0;
        const isFuture = day > todayDay;

        let fillColor = "#ffffff"; // 默认：未来日期或 0 经验，用白色
        if (!isFuture && expValue > 0 && monthExpMax > 0) {
          const ratio = expValue / monthExpMax;
          const base = THEME.frameLight || "#c8b29a";
          const mid = THEME.frame || "#8a6148";
          const deep = THEME.frameDark || "#5a3c2d";
          if (ratio < 0.34) fillColor = base;       // 浅
          else if (ratio < 0.67) fillColor = mid;   // 中
          else fillColor = deep;                    // 深
        }

        fillRect(targetCtx, cx, cy, cellW, cellH, fillColor);
        targetCtx.strokeStyle = THEME.paperMuted;
        targetCtx.lineWidth = 1;
        targetCtx.strokeRect(cx + 0.5, cy + 0.5, cellW - 1, cellH - 1);

        const label = year + "-" + (month + 1).toString().padStart(2, "0") + "-" + day.toString().padStart(2, "0");
        const tooltipText = label + "：EXP " + expValue + "，完成 " + doneValue + " 个任务";
        registerRegion(mainRegions, cx, cy, cellW, cellH, function () {}, { cursor: "default", tooltip: tooltipText });
      }
    }
    const codexStartY = historyStartY + historyHeight;
    // 冒险图鉴：展示最近解锁的 5 个条目 + 第 6 个“+”
    drawSectionHeader(targetCtx, x + 30, codexStartY - 12, "冒险图鉴", "最近解锁的图鉴");
    const codex = activeCodex();
    function sortableUnlockTs(entry) {
      if (!entry) return 0;
      if (entry.unlockedAtMs != null) return entry.unlockedAtMs;
      if (entry.unlockedAt) return new Date(entry.unlockedAt + "T12:00:00").getTime();
      return 0;
    }
    const candidateIds = (codex.recentIds || []).slice(0, 80);
    const recentIds = candidateIds
      .filter(function (id) { var e = codex.items[id]; return e && e.unlocked; })
      .sort(function (a, b) { return sortableUnlockTs(codex.items[b]) - sortableUnlockTs(codex.items[a]); })
      .slice(0, 5);
    function drawCodexPreviewBox(entryId, slotIndex, isPlus) {
      const pxX = x + 30 + slotIndex * (previewW + previewGap);
      const pxY = codexStartY + 46;
      drawCard(targetCtx, pxX, pxY, previewW, previewH, THEME.paper);
      const frameSize = previewW - 18;
      const frameX = pxX + (previewW - frameSize) / 2;
      const frameY = pxY + 8;
      let title = "";
      if (isPlus) {
        // 像素风格大加号：不再使用宝箱图，只画边框和由方块组成的“+”
        const plusPadding = 6;
        const plusSize = frameSize - plusPadding * 2;
        const plusX = frameX + plusPadding;
        const plusY = frameY + plusPadding;
        // 外框
        targetCtx.strokeStyle = THEME.frameDark;
        targetCtx.lineWidth = 4;
        targetCtx.strokeRect(plusX, plusY, plusSize, plusSize);
        // 中心加号（用矩形拼出粗体“+”）
        const barThickness = Math.max(4, Math.round(plusSize / 5));
        const centerX = plusX + plusSize / 2;
        const centerY = plusY + plusSize / 2;
        const half = plusSize / 2 - barThickness;
        // 竖条
        fillRect(targetCtx, centerX - barThickness / 2, centerY - half, barThickness, half * 2, THEME.ink);
        // 横条
        fillRect(targetCtx, centerX - half, centerY - barThickness / 2, half * 2, barThickness, THEME.ink);
        title = "查看全部";
        registerRegion(mainRegions, pxX, pxY, previewW, previewH, function () { setModal({ type: "codex", category: "all", selectedId: null, scroll: 0 }); });
      } else if (entryId) {
        const parsed = (function () {
          const idx = entryId.indexOf(":");
          if (idx < 0) return { kind: "unknown", key: entryId };
          return { kind: entryId.slice(0, idx), key: entryId.slice(idx + 1) };
        })();
        let sprite = null;
        let frameColor = null;
        if (parsed.kind === "scene" || parsed.kind === "hair" || parsed.kind === "top" || parsed.kind === "bottom" || parsed.kind === "gear" || parsed.kind === "supply" || parsed.kind === "accessory") {
          const item = catalogItemById(parsed.key);
          frameColor = itemRarityFrameColor(item);
          sprite = item ? getCatalogPreview(item, frameSize) : getTreasureSprite(frameSize);
          title = item ? item.name : "未知条目";
        } else if (parsed.kind === "pet") {
          const key = String(parsed.key || "");
          const eggItem = catalogItemById(key);
          if (eggItem && eggItem.category === "petEgg") {
            // 图鉴中记录的是宠物蛋条目：按蛋显示名称与小图
            frameColor = itemRarityFrameColor(eggItem);
            sprite = getEggSprite(eggItem.petSpecies, frameSize);
            title = eggItem.name || key;
          } else {
            // 图鉴记录的是宠物物种阶段：按宠物形象与阶段名称展示
            const parts = key.split(":");
            const species = parts[0];
            const stage = clamp(Number(parts[1]) || 0, 0, PET_STAGES.length - 1);
            const petSpriteDemo = { species: species, stage: stage, isEgg: false, displayForm: stage };
            sprite = getPetSpriteSafe(petSpriteDemo, frameSize, stage);
            frameColor = petRarityFrameColor({ species: species });
            const speciesName = PET_SPECIES[species] && PET_SPECIES[species].name ? PET_SPECIES[species].name : species;
            const stageName = PET_STAGES[stage] || "";
            title = stageName ? (speciesName + "·" + stageName) : speciesName;
          }
        } else if (parsed.kind === "boss") {
          const boss = BOSS_ROTATION.find(function (b) { return b.id === parsed.key; });
          if (boss) {
            title = boss.name;
            sprite = getBossSpriteSafe(boss.kind, frameSize);
            frameColor = bossRarityFrameColor(boss);
          } else {
            title = "未知 Boss";
            sprite = getBossSpriteSafe("ghost", frameSize);
            frameColor = bossRarityFrameColor({ level: 1 });
          }
        } else if (parsed.kind === "companion") {
          const companion = companionById(parsed.key);
          if (companion) {
            title = companion.name;
            sprite = getCompanionCodexSprite(companion, frameSize);
            frameColor = itemRarityFrameColor({ rarity: companion.spriteType === "monster" ? "普通" : "精良" });
          } else {
            title = "未知伙伴";
            sprite = getTreasureSprite(frameSize);
            frameColor = itemRarityFrameColor({ rarity: "普通" });
          }
        }
        const codexEntry = codex.items[entryId];
        drawSpriteFrame(targetCtx, sprite || getTreasureSprite(frameSize), frameX, frameY, frameSize, frameColor);
        // 首页最近解锁区域：小标题相对于预览图片向右偏移约 70 像素
        const titleWidth = Math.max(24, previewW - 8);
        const titleX = pxX + previewW / 2;
        const titleY = pxY + previewH - 22;
        drawTextFitted(targetCtx, title, titleX, titleY, titleWidth, 16, THEME.inkSoft, "600", "center", 12);
        registerRegion(mainRegions, pxX, pxY, previewW, previewH, function () {
          setModal({ type: "codex", category: "all", selectedId: codexEntry && codexEntry.id ? codexEntry.id : entryId, scroll: 0 });
        });
      }
    }
    for (let i = 0; i < 5; i += 1) {
      drawCodexPreviewBox(recentIds[i] || null, i, false);
    }
    drawCodexPreviewBox(null, 5, true);

    // 冒险成就：展示最近获得的 5 个成就 + 第 6 个“+”
    const achievementStartY = codexStartY + codexHeight;
    drawSectionHeader(targetCtx, x + 30, achievementStartY - 12, "冒险成就", "最近解锁的成就");
    const achievementsState = activeAchievements();
    const achievementIds = (achievementsState.recentIds || []).slice(0, 40);
    const recentAchIds = achievementIds
      .filter(function (id) { return achievementsState.unlocked && achievementsState.unlocked[id]; })
      .slice(0, 5);
    function drawAchievementPreviewBox(achievementId, slotIndex, isPlus) {
      const pxX = x + 30 + slotIndex * (previewW + previewGap);
      const pxY = achievementStartY + 46;
      drawCard(targetCtx, pxX, pxY, previewW, previewH, THEME.paper);
      const frameSize = previewW - 18;
      const frameX = pxX + (previewW - frameSize) / 2;
      const frameY = pxY + 8;
      if (isPlus) {
        const plusPadding = 6;
        const plusSize = frameSize - plusPadding * 2;
        const plusX = frameX + plusPadding;
        const plusY = frameY + plusPadding;
        targetCtx.strokeStyle = THEME.frameDark;
        targetCtx.lineWidth = 4;
        targetCtx.strokeRect(plusX, plusY, plusSize, plusSize);
        const barThickness = Math.max(4, Math.round(plusSize / 5));
        const centerX = plusX + plusSize / 2;
        const centerY = plusY + plusSize / 2;
        const half = plusSize / 2 - barThickness;
        fillRect(targetCtx, centerX - barThickness / 2, centerY - half, barThickness, half * 2, THEME.ink);
        fillRect(targetCtx, centerX - half, centerY - barThickness / 2, half * 2, barThickness, THEME.ink);
        registerRegion(mainRegions, pxX, pxY, previewW, previewH, function () {
          setModal({ type: "achievements", category: "all", selectedId: null, scroll: 0 });
        });
        return;
      }
      const ach = achievementId && ACHIEVEMENTS.find(function (a) { return a.id === achievementId; });
      if (!ach) return;
      const unlocked = Boolean(achievementsState.unlocked && achievementsState.unlocked[achievementId]);
      // 小成就图标：简单按类别画不同颜色的小图
      drawAchievementIcon(targetCtx, frameX, frameY, frameSize, ach, unlocked, false);
      const titleWidth = Math.max(24, previewW - 8);
      const titleX = pxX + previewW / 2;
      const titleY = pxY + previewH - 22;
      drawTextFitted(targetCtx, ach.name, titleX, titleY, titleWidth, 16, unlocked ? THEME.inkSoft : "#a08f87", "600", "center", 12);
      registerRegion(mainRegions, pxX, pxY, previewW, previewH, function () {
        setModal({ type: "achievements", category: "all", selectedId: achievementId, scroll: 0 });
      });
    }
    for (let i = 0; i < 5; i += 1) {
      drawAchievementPreviewBox(recentAchIds[i] || null, i, false);
    }
    drawAchievementPreviewBox(null, 5, true);

    const logStartY = achievementStartY + achievementHeight;
    drawSectionHeader(targetCtx, x + 30, logStartY - 12, "冒险日志", "最近进展");
    drawButton(targetCtx, x + w - 118, logStartY - 8, 70, 46, "清屏", "red", { small: true });
    registerRegion(mainRegions, x + w - 118, logStartY - 8, 70, 46, function () {
      state.logs = [];
      addLog("日志已清空，准备重新开始新的记录。");
      saveState();
      renderApp();
    });
    let cursor = logStartY + 48;
    if (!state.logs.length) {
      drawCard(targetCtx, x + 30, cursor, w - 60, 94, THEME.paper);
      drawTextFitted(targetCtx, "今天还没有新日志。完成任务、冒险或兑换奖励后会记录在这里。", x + w / 2, cursor + 34, w - 160, 20, THEME.inkSoft, "500", "center", 14);
      cursor += 108;
    } else {
      state.logs.forEach(function (log, index) {
        const metric = logMetrics[index];
        drawCard(targetCtx, x + 30, cursor, w - 60, metric.height, THEME.paper);
        drawParagraph(targetCtx, log.message, x + 52, cursor + 24, w - 260, 18, THEME.inkSoft, 26, { maxLines: 3 });
        drawTextFitted(targetCtx, log.stamp, x + w - 54, cursor + 20, 128, 17, "#b17f73", "500", "right", 13);
        cursor += metric.height + 14;
      });
    }
    return y + panelHeight;
  }

  function renderMain(targetCtx, view) {
    renderBackground(targetCtx, view, desiredDesignHeight);
    renderHeader(targetCtx, view);
    let cursor = view.width <= 560 ? 206 : 224;
    cursor = renderDashboard(targetCtx, view, cursor) + 22;
    cursor = renderNav(targetCtx, view, cursor) + 24;
    if (state.page === "tasks") cursor = renderTasksPage(targetCtx, view, cursor);
    else if (state.page === "shop") cursor = renderShopPage(targetCtx, view, cursor);
    else if (state.page === "pets") cursor = renderSocialPage(targetCtx, view, cursor);
    else if (state.page === "adventure") cursor = renderAdventurePage(targetCtx, view, cursor);
    else cursor = renderJournalPage(targetCtx, view, cursor);
    return cursor + 40;
  }


  function renderHoverTooltip(targetCtx, view) {
    if (!hoverTooltip || state.modal) return;
    const padding = 14;
    const text = hoverTooltip.text;
    const maxWidth = Math.max(120, view.logicalWidth - 36);
    const width = Math.min(maxWidth, measureStyledTextWidth(targetCtx, text, 16, "600", null) + padding * 2);
    const height = 40;
    const offset = 10;
    let x = (hoverTooltip.cursorX !== undefined ? hoverTooltip.cursorX : hoverTooltip.x) + offset;
    let y = (hoverTooltip.cursorY !== undefined ? hoverTooltip.cursorY : hoverTooltip.y) + offset;
    if (x + width > view.logicalWidth - 18) x = Math.max(18, (hoverTooltip.cursorX !== undefined ? hoverTooltip.cursorX : hoverTooltip.x) - width - offset);
    if (y + height > view.logicalHeight - 18) y = Math.max(18, (hoverTooltip.cursorY !== undefined ? hoverTooltip.cursorY : hoverTooltip.y) - height - offset);
    x = clamp(x, 18, view.logicalWidth - width - 18);
    y = clamp(y, 18, view.logicalHeight - height - 18);
    targetCtx.save();
    targetCtx.globalAlpha = 0.3;
    fillRect(targetCtx, x + 5, y + 5, width, height, THEME.frameDark);
    fillRect(targetCtx, x, y, width, height, THEME.frame);
    targetCtx.globalAlpha = 0.65;
    targetCtx.strokeStyle = THEME.paperSoft;
    targetCtx.lineWidth = 2;
    targetCtx.strokeRect(x + 3, y + 3, width - 6, height - 6);
    targetCtx.restore();
    drawText(targetCtx, text, x + padding, y + 11, 16, THEME.paperSoft, "600");
  }

  function renderToast(targetCtx, view) {
    if (!state.toast) return;
    const tone = "#ffffff";
    const shadowOffset = 6;
    const rightInset = view.logicalWidth <= 640 ? 16 : 22;
    const leftInset = view.logicalWidth <= 640 ? 12 : 18;
    const availableWidth = Math.max(180, Math.floor(view.logicalWidth - leftInset - rightInset - shadowOffset));
    const targetWidth = Math.max(view.logicalWidth <= 640 ? 240 : 260, Math.floor(view.contentWidth * (view.logicalWidth <= 640 ? 0.72 : 0.52)));
    const width = Math.min(560, availableWidth, targetWidth);
    const contentRight = view.left + view.contentWidth;
    const desiredX = contentRight - width - rightInset - shadowOffset;
    const x = clamp(desiredX, leftInset, view.logicalWidth - width - rightInset - shadowOffset);
    const y = view.logicalWidth <= 640 ? 18 : 28;
    const lines = String(state.toast.text || "").split("\n");
    const height = Math.max(72, 26 + lines.length * 22);
    fillRect(targetCtx, x + shadowOffset, y + shadowOffset, width, height, THEME.frameDark);
    fillRect(targetCtx, x, y, width, height, THEME.toastBg);
    lines.forEach(function (line, index) {
      drawTextFitted(targetCtx, line, x + 22, y + 22 + index * 22, width - 44, 20, tone, "600", "left", 12);
    });
  }

  function renderHpWarningModal(targetCtx, view) {
    const width = Math.min(520, view.contentWidth - 80);
    const height = 260;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    // 圆形像素哭脸小人
    const iconSize = 72;
    const iconY = y + 54;
    const centerX = x + width / 2;
    const iconX = centerX - iconSize / 2;
    const unit = iconSize / 16;
    const cx = iconX + 8 * unit;
    const cy = iconY + 8 * unit;
    // 圆脸
    for (let row = -7; row <= 7; row += 1) {
      for (let col = -7; col <= 7; col += 1) {
        if (row * row + col * col <= 7 * 7 + 1) {
          fillRect(targetCtx, cx + col * unit, cy + row * unit, unit, unit, "#f2d6b8");
        }
      }
    }
    // 眼睛
    fillRect(targetCtx, cx - 3 * unit, cy - 1 * unit, 2 * unit, 2 * unit, "#3a2b2b");
    fillRect(targetCtx, cx + 1 * unit, cy - 1 * unit, 2 * unit, 2 * unit, "#3a2b2b");
    // 嘴巴（稍微下弯）
    fillRect(targetCtx, cx - 3 * unit, cy + 2 * unit, 6 * unit, unit, "#3a2b2b");
    fillRect(targetCtx, cx - 2 * unit, cy + 3 * unit, 4 * unit, unit, "#3a2b2b");
    // 泪水
    fillRect(targetCtx, cx - 4 * unit, cy + 1 * unit, unit, 3 * unit, "#6ec3ff");
    fillRect(targetCtx, cx + 3 * unit, cy + 1 * unit, unit, 3 * unit, "#6ec3ff");

    const textY = iconY + iconSize + 10;
    const message = state.modal && state.modal.reason === "signIn"
      ? "先去完成一个任务再来签到哦！"
      : "体力不足，先休息一下再来吧！";
    drawText(targetCtx, message, centerX, textY, 22, "#ffffff", "700", "center");

    drawButton(targetCtx, x + width - 132, y + height - 70, 106, 52, "知道了", "paper", { small: true });
    registerRegion(overlayRegions, x + width - 132, y + height - 70, 106, 52, function () { setModal(null); });
  }

  // Flappy 小游戏（冒险页内）
  const FLAPPY_RUNTIME = { raf: 0 };
  function renderFlappyModal(targetCtx, view) {
    const modal = state.modal || {};
    if (!modal || modal.type !== "flappy") return;
    const width = Math.min(720, view.contentWidth - 60);
    const height = Math.min(940, view.logicalHeight - 60);
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    const headerH = 64;
    const innerX = x + 18;
    const innerY = y + 18;
    const innerW = width - 36;
    const innerH = height - 36;

    // 初始化 bird 位置（只做一次）
    if (!Number.isFinite(modal.birdY) || modal.birdY === 0) {
      modal.birdY = innerY + headerH + (innerH - headerH) * 0.45;
      modal.birdV = 0;
    }
    if (!Array.isArray(modal.pipes)) modal.pipes = [];
    if (!Number.isFinite(modal.score)) modal.score = 0;
    if (!Number.isFinite(modal.coinCount)) modal.coinCount = 0;
    if (!Number.isFinite(modal.lastTick)) modal.lastTick = performance.now();

    const location = ADVENTURE_LOCATIONS.find(function (l) { return l.id === modal.locationId; });
    const sceneName = (location && location.scene) || modal.scene || (state.profile.appearance && state.profile.appearance.background) || "草地小径";
    const bg = getSceneSprite(sceneName, 240);
    const pet = currentPet();
    const petSprite = getPetBodySpriteSafe(pet, 96, petDisplayFormValue(pet)) || getPetBodySpriteSafe(pet, 48, petDisplayFormValue(pet));

    // 游戏区（竖屏）
    const gameX = innerX;
    const gameY = innerY + headerH;
    const gameW = innerW;
    const gameH = innerH - headerH - 84;
    const floorH = 26;

    const palette = flappyPipePaletteForLocation(location);
    const tierOptions = flappyTierOptionsForLocation(location);

    // UI 外框
    drawPanel(targetCtx, x, y, width, height, THEME.paper);
    drawText(targetCtx, (modal.locationName || (location && location.name) || "小游戏") + " · 飞行挑战", innerX + 8, innerY + 16, 18, "#d8aa95", "600");
    const headerLine = "金币×" + (modal.coinMultiplier || 10) + (modal.tierLabel ? ("  •  难度 " + modal.tierLabel) : "");
    drawText(targetCtx, headerLine, innerX + 8, innerY + 40, 14, "#f2dac8", "500");

    // 关闭按钮
    const closeW = 74;
    const closeH = 54;
    const closeX = x + width - closeW - 18;
    const closeY = y + 18;
    drawButton(targetCtx, closeX, closeY, closeW, closeH, "关闭", "red", { small: true });
    registerRegion(overlayRegions, closeX, closeY, closeW, closeH, function () {
      state.modal = null;
      saveState();
      renderApp();
    });

    // 背景铺满（重复拉伸以适配竖屏）
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(gameX, gameY, gameW, gameH);
    targetCtx.clip();
    // 用大尺寸场景图做铺底：按宽铺满，高度裁切
    const bgSize = Math.max(gameW, gameH);
    const bgSprite = getSceneSprite(sceneName, bgSize);
    if (bgSprite) {
      targetCtx.drawImage(bgSprite, gameX, gameY, gameW, gameH);
    } else {
      fillRect(targetCtx, gameX, gameY, gameW, gameH, "#4EC0CA");
    }

    // 更新逻辑（只在 playing 时）
    const now = performance.now();
    const dt = Math.min(48, Math.max(0, now - (modal.lastTick || now)));
    modal.lastTick = now;

    const gravity = 0.65;
    const jumpV = -10.2;
    const speed = 3.0;
    const pipeW = 62;
    const pipeSpacing = 240;
    const minGap = 168;
    const maxGap = 216;

    function clampY(v) { return clamp(v, gameY + 20, gameY + gameH - floorH - 20); }
    function circleRect(cx, cy, cr, rx, ry, rw, rh) {
      const closestX = Math.max(rx, Math.min(cx, rx + rw));
      const closestY = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - closestX;
      const dy = cy - closestY;
      return dx * dx + dy * dy < cr * cr;
    }
    function circleCircle(x1, y1, r1, x2, y2, r2) {
      const dx = x1 - x2;
      const dy = y1 - y2;
      return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
    }

    function ensurePipe() {
      const last = modal.pipes.length ? modal.pipes[modal.pipes.length - 1] : null;
      if (!last || last.x < gameX + gameW - pipeSpacing) {
        const gap = randomInt(minGap, maxGap);
        const topMin = 46;
        const topMax = Math.max(topMin + 20, gameH - floorH - gap - 46);
        const topH = randomInt(topMin, topMax);
        const hasCoin = Math.random() < 0.42;
        const coinYRel = hasCoin ? randomInt(40, Math.max(40, gap - 40)) : 0;
        modal.pipes.push({
          x: gameX + gameW + 6,
          gap: gap,
          topH: topH,
          bottomY: topH + gap,
          passed: false,
          hasCoin: hasCoin,
          coinYRel: coinYRel,
          coinCollected: false,
        });
      }
    }

    function flapStartIfNeeded() {
      // over 状态允许直接重新挑战：先回到 ready，再按同一套开始逻辑扣槽重置
      if (modal.phase === "over") {
        modal.phase = "ready";
        modal.spentSlotsThisRun = false;
      }
      if (modal.phase !== "playing") {
        if (!modal.tierId) {
          setToast("先选择目标难度，再点击开始。", "info");
          if (currentView) renderOverlay(currentView); else renderApp();
          return;
        }
        // 每次开始/重新开始都要消耗冒险槽
        const cost = Math.max(1, Number(modal.slotCost) || 1);
        if ((state.adventure.slots || 0) < cost) {
          setToast("冒险槽不够，无法开始挑战。", "danger");
          if (currentView) renderOverlay(currentView); else renderApp();
          return;
        }
        state.adventure.slots -= cost;
        modal.spentSlotsThisRun = true;
        modal.phase = "playing";
        modal.score = 0;
        modal.coinCount = 0;
        modal.pipes = [];
        modal.birdY = clampY(gameY + gameH * 0.45);
        modal.birdV = 0;
        modal.lastTick = performance.now();
      }
      modal.birdV = jumpV;
    }

    // 点击游戏区域：本帧立即执行开始/起跳
    registerRegion(overlayRegions, gameX, gameY, gameW, gameH, function () {
      if (modal.phase === "select") return;
      flapStartIfNeeded();
    }, { regionKey: "flappy-flap" });

    if (modal.phase === "playing") {
      // 物理
      modal.birdV += gravity * (dt / 16);
      modal.birdY += modal.birdV * (dt / 16);

      ensurePipe();
      // 管道移动 + 判分/吃金币
      const birdX = gameX + 96;
      const birdR = 18;
      modal.pipes.forEach(function (p) {
        p.x -= speed * (dt / 16);
        if (!p.coinCollected && p.hasCoin) {
          const cx = p.x + pipeW / 2;
          const cy = gameY + p.topH + p.coinYRel;
          if (circleCircle(birdX, modal.birdY, birdR, cx, cy, 16)) {
            p.coinCollected = true;
            modal.coinCount += 1;
          }
        }
        if (!p.passed && p.x + pipeW < birdX) {
          p.passed = true;
          modal.score += 1;
        }
      });
      while (modal.pipes.length && modal.pipes[0].x + pipeW < gameX - 40) modal.pipes.shift();

      // 碰撞
      const hitWall = modal.birdY - birdR < gameY || modal.birdY + birdR > (gameY + gameH - floorH);
      const hitPipe = modal.pipes.some(function (p) {
        const topHit = circleRect(birdX, modal.birdY, birdR, p.x, gameY, pipeW, p.topH);
        const bottomHit = circleRect(birdX, modal.birdY, birdR, p.x, gameY + p.bottomY, pipeW, gameH - p.bottomY - floorH);
        return topHit || bottomHit;
      });
      if (hitWall || hitPipe) {
        modal.phase = "over";
        // 小游戏完成次数（不计入冒险次数成就）
        state.totalCompletedMinigames = (state.totalCompletedMinigames || 0) + 1;
        const miniCount = (state.totalCompletedMinigames || 0);
        if (miniCount >= 1) unlockAchievement("adventure_minigame_1");
        if (miniCount >= 10) unlockAchievement("adventure_minigame_10");
        if (miniCount >= 50) unlockAchievement("adventure_minigame_50");
        if (miniCount >= 100) unlockAchievement("adventure_minigame_100");
        // 结算金币
        const mult = Math.max(1, Number(modal.coinMultiplier) || 10);
        const realGold = Math.max(0, (Number(modal.coinCount) || 0) * mult);
        if (realGold > 0) {
          addGold(realGold);
          addLog("在“" + (modal.locationName || "小游戏") + "”的飞行挑战中吃到了 " + modal.coinCount + " 枚金币，结算为 " + realGold + " 金币。");
          queueToast("小游戏结算：+" + realGold + " 金币", "success");
        } else {
          addLog("在“" + (modal.locationName || "小游戏") + "”的飞行挑战中未获得金币。");
          queueToast("小游戏结束：没有吃到金币", "info");
        }

        // 达标额外奖品（使用与冒险掉落相同的逻辑；难度越高，奖励样数越多）
        const target = Math.max(1, Number(modal.targetScore) || 10);
        // 难度成就：需要本局达成目标分数才算
        if (modal.score >= target) {
          const tierId = String(modal.tierId || "");
          if (tierId === "tier1") unlockAchievement("adventure_minigame_tier1");
          else if (tierId === "tier2") unlockAchievement("adventure_minigame_tier2");
          else if (tierId === "tier3") unlockAchievement("adventure_minigame_tier3");
        }
        if (modal.score >= target && location) {
          const rolls = Math.max(1, Number(modal.bonusRolls) || 1);
          const labels = [];
          for (let i = 0; i < rolls; i += 1) {
            const extra = buildTripReward(location);
            if (extra.type === "gold") {
              addGold(extra.gold);
              labels.push("+" + extra.gold + " 金币");
            } else if (extra.lootId) {
              const granted = grantCatalogReward(extra.lootId, location.name + "（达标奖励）");
              if (granted && granted.label) labels.push(granted.label);
            }
          }
          if (labels.length) {
            addLog("飞行挑战达标奖励（" + rolls + " 项）： " + labels.join("、") + "。");
            queueToast("达标奖励：" + labels.join("、"), "success");
          }
        }
        saveState();
      }
    }

    // 绘制地面
    fillRect(targetCtx, gameX, gameY + gameH - floorH, gameW, floorH, "rgba(0,0,0,0.18)");

    // 绘制管道与金币
    modal.pipes.forEach(function (p) {
      fillRect(targetCtx, p.x, gameY, pipeW, p.topH, palette.pipe);
      fillRect(targetCtx, p.x, gameY + p.bottomY, pipeW, gameH - p.bottomY - floorH, palette.pipe);
      // 边缘描边让柱子更清晰
      fillRect(targetCtx, p.x, gameY, 4, p.topH, palette.edge);
      fillRect(targetCtx, p.x, gameY + p.bottomY, 4, gameH - p.bottomY - floorH, palette.edge);
      fillRect(targetCtx, p.x + pipeW - 4, gameY, 4, p.topH, palette.edge);
      fillRect(targetCtx, p.x + pipeW - 4, gameY + p.bottomY, 4, gameH - p.bottomY - floorH, palette.edge);
      if (p.hasCoin && !p.coinCollected) {
        // 像素金币（直径 30，无方形外框）
        const cx = p.x + pipeW / 2;
        const cy = gameY + p.topH + p.coinYRel;
        const size = 30;
        const unit = size / 16;
        const x0 = cx - size / 2;
        const y0 = cy - size / 2;
        // 颜色：明黄/暗边/高光
        const c0 = "#f2d15a";
        const c1 = "#d6b14a";
        const c2 = "#fff1b3";
        const edge = "#2b1a12";
        function px(gx, gy, gw, gh, color) {
          fillRect(targetCtx, x0 + gx * unit, y0 + gy * unit, gw * unit, gh * unit, color);
        }
        // 外圈（近似圆形）
        px(5, 1, 6, 1, c1);
        px(3, 2, 10, 1, c1);
        px(2, 3, 12, 2, c1);
        px(1, 5, 14, 6, c1);
        px(2, 11, 12, 2, c1);
        px(3, 13, 10, 1, c1);
        px(5, 14, 6, 1, c1);
        // 内填充
        px(5, 3, 6, 10, c0);
        px(4, 4, 8, 8, c0);
        px(3, 6, 10, 4, c0);
        // 高光
        px(5, 4, 2, 2, c2);
        px(7, 4, 2, 1, c2);
        px(4, 6, 2, 1, c2);
        // 中央“孔”/纹理
        px(7, 7, 2, 2, c1);
        px(7, 9, 2, 2, c1);
        // 外圈再补几处更像“圆形描边”（不画方形外框）
        px(5, 1, 6, 1, edge);
        px(3, 2, 2, 1, edge); px(11, 2, 2, 1, edge);
        px(2, 3, 1, 2, edge); px(13, 3, 1, 2, edge);
        px(1, 5, 1, 6, edge); px(14, 5, 1, 6, edge);
        px(2, 11, 1, 2, edge); px(13, 11, 1, 2, edge);
        px(3, 13, 2, 1, edge); px(11, 13, 2, 1, edge);
        px(5, 14, 6, 1, edge);
      }
    });

    function spriteOpaqueBounds(spriteCanvasEl) {
      if (!spriteCanvasEl) return null;
      const w = spriteCanvasEl.width || 0;
      const h = spriteCanvasEl.height || 0;
      if (!w || !h) return null;
      const sctx = spriteCanvasEl.getContext && spriteCanvasEl.getContext("2d");
      if (!sctx) return null;
      const img = sctx.getImageData(0, 0, w, h).data;
      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y0 = 0; y0 < h; y0 += 1) {
        for (let x0 = 0; x0 < w; x0 += 1) {
          const a = img[(y0 * w + x0) * 4 + 3];
          if (a > 0) {
            if (x0 < minX) minX = x0;
            if (y0 < minY) minY = y0;
            if (x0 > maxX) maxX = x0;
            if (y0 > maxY) maxY = y0;
          }
        }
      }
      if (maxX < 0 || maxY < 0) return null;
      return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    }

    function drawSpriteCroppedFitHeight(spriteCanvasEl, dx, dy, sizePx) {
      if (!spriteCanvasEl) return;
      const b = spriteOpaqueBounds(spriteCanvasEl);
      if (!b) return;
      // 关键：以“本体从最上到最下”的高度缩放到 sizePx（你说的：等于原来带背景的高度）
      const scale = sizePx / b.h;
      const dw = b.w * scale;
      const dh = b.h * scale;
      const x0 = dx + (sizePx - dw) / 2;
      const y0 = dy + (sizePx - dh) / 2;
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.drawImage(spriteCanvasEl, b.x, b.y, b.w, b.h, x0, y0, dw, dh);
    }

    // 绘制“鸟”（宠物本体）
    const birdX = gameX + 96;
    const drawSize = 66;
    drawSpriteCroppedFitHeight(petSprite, birdX - drawSize / 2, modal.birdY - drawSize / 2, drawSize);

    // HUD
    drawText(targetCtx, "分数 " + (modal.score || 0), gameX + 18, gameY + 14, 18, "#ffffff", "700");
    drawText(targetCtx, "金币 " + (modal.coinCount || 0), gameX + 18, gameY + 40, 18, "#ffe08a", "700");

    // 选择/引导/结算面板
    if (modal.phase === "select") {
      // 选择面板更大，文字更清晰
      fillRect(targetCtx, gameX + 34, gameY + gameH / 2 - 148, gameW - 68, 296, "rgba(255,255,255,0.90)");
      targetCtx.strokeStyle = THEME.black;
      targetCtx.lineWidth = 4;
      targetCtx.strokeRect(gameX + 34, gameY + gameH / 2 - 148, gameW - 68, 296);
      drawText(targetCtx, "选择目标难度", gameX + gameW / 2, gameY + gameH / 2 - 114, 28, "#3a2b2b", "700", "center");
      // 三档卡片按钮（更大 + 两行排版）
      const bw = Math.min(230, Math.floor((gameW - 160) / 3));
      const bh = 112;
      const gap = 18;
      const startX = gameX + (gameW - (bw * 3 + gap * 2)) / 2;
      const by = gameY + gameH / 2 - 62;
      tierOptions.forEach(function (opt, idx) {
        const bx = startX + idx * (bw + gap);
        const active = modal.tierId === opt.id;
        // 先画底板
        drawButton(targetCtx, bx, by, bw, bh, "", active ? "yellow" : "paper", { small: true, active: active });
        // 再画两行大字（避免 drawButton 自动缩小）
        const line1H = 28;
        const line2H = 20;
        const line3H = 20;
        const lineGap = 5;
        const blockH = line1H + lineGap + line2H + lineGap + line3H;
        const blockY = by + (bh - blockH) / 2;
        const centerX = bx + bw / 2;
        const labelSize = fitCanvasTextSize(opt.label, bw - 28, 26, "700", 18);
        drawText(targetCtx, opt.label, centerX, blockY, labelSize, THEME.ink, "700", "center");
        const targetLine = "目标 " + opt.target + " 分";
        const rewardLine = "奖励 " + opt.bonusRolls + " 项";
        const targetSize = fitCanvasTextSize(targetLine, bw - 28, 19, "600", 13);
        const rewardSize = fitCanvasTextSize(rewardLine, bw - 28, 19, "600", 13);
        drawText(targetCtx, targetLine, centerX, blockY + line1H + lineGap, targetSize, THEME.inkSoft, "600", "center");
        drawText(targetCtx, rewardLine, centerX, blockY + line1H + lineGap + line2H + lineGap, rewardSize, THEME.inkSoft, "600", "center");
        registerRegion(overlayRegions, bx, by, bw, bh, function () {
          modal.tierId = opt.id;
          modal.tierLabel = opt.label;
          modal.targetScore = opt.target;
          modal.bonusRolls = opt.bonusRolls;
          modal.phase = "ready";
          renderApp();
        });
      });
      drawText(targetCtx, "选好后点击屏幕开始（每局消耗冒险槽 " + (modal.slotCost || 0) + "）", gameX + gameW / 2, gameY + gameH / 2 + 104, 18, "#3a2b2b", "600", "center");
    } else if (modal.phase !== "playing") {
      fillRect(targetCtx, gameX + 60, gameY + gameH / 2 - 78, gameW - 120, 156, "rgba(255,255,255,0.84)");
      targetCtx.strokeStyle = THEME.black;
      targetCtx.lineWidth = 4;
      targetCtx.strokeRect(gameX + 60, gameY + gameH / 2 - 78, gameW - 120, 156);
      if (modal.phase === "over") {
        drawText(targetCtx, "挑战结束", gameX + gameW / 2, gameY + gameH / 2 - 54, 26, "#8E656F", "700", "center");
        drawText(targetCtx, "分数：" + (modal.score || 0) + "  /  目标：" + (modal.targetScore || 0), gameX + gameW / 2, gameY + gameH / 2 - 16, 18, "#3a2b2b", "600", "center");
        drawText(targetCtx, "金币：" + (modal.coinCount || 0) + "（结算×" + (modal.coinMultiplier || 10) + "）", gameX + gameW / 2, gameY + gameH / 2 + 16, 18, "#3a2b2b", "600", "center");
        drawText(targetCtx, "点击屏幕重新挑战（会再次消耗冒险槽）", gameX + gameW / 2, gameY + gameH / 2 + 52, 16, "#3a2b2b", "500", "center");
      } else {
        drawText(targetCtx, "点击屏幕开始", gameX + gameW / 2, gameY + gameH / 2 - 24, 34, "#3a2b2b", "800", "center");
        const readyLine = "难度：" + (modal.tierLabel || "—") + "  •  目标：" + (modal.targetScore || "—") + "  •  达标奖励：" + (modal.bonusRolls || 0) + " 项";
        const readySize = fitCanvasTextSize(readyLine, gameW - 160, 22, "600", 16);
        drawText(targetCtx, readyLine, gameX + gameW / 2, gameY + gameH / 2 + 20, readySize, "#3a2b2b", "600", "center");
      }
    }

    targetCtx.restore();

    // 底部说明
    drawText(targetCtx, "点击屏幕起跳 · 右上角关闭", innerX + 8, y + height - 30, 14, "#d8aa95", "500");

    // 维持动画：只刷新 overlay，避免整页 renderApp
    if (state.modal && state.modal.type === "flappy" && currentView) {
      if (!FLAPPY_RUNTIME.raf) {
        FLAPPY_RUNTIME.raf = requestAnimationFrame(function () {
          FLAPPY_RUNTIME.raf = 0;
          if (state.modal && state.modal.type === "flappy" && currentView) {
            renderOverlay(currentView);
          }
        });
      }
    }
  }

  function renderExportConfirmModal(targetCtx, view) {
    const width = Math.min(520, view.contentWidth - 80);
    const height = 260;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "导出存档", x + width / 2, y + 26, 18, "#d8aa95", "500", "center");
    drawPixelText(targetCtx, "确认导出存档吗？", x + 26, y + 60, { size: 24, color: "#fff5e8", font: "sans-serif" });
    drawTextFitted(targetCtx, "会将当前进度保存为一个 JSON 文件，下载到本地设备。", x + 26, y + 104, width - 52, 18, "#fff5e8", "500", "left", 12);
    const btnW = (width - 52 - 18) / 2;
    const btnY = y + height - 86;
    drawButton(targetCtx, x + 26, btnY, btnW, 56, "确定", "green");
    drawButton(targetCtx, x + 26 + btnW + 18, btnY, btnW, 56, "取消", "red");
    registerRegion(overlayRegions, x + 26, btnY, btnW, 56, exportSaveToFile);
    registerRegion(overlayRegions, x + 26 + btnW + 18, btnY, btnW, 56, function () { setModal(null); });
  }

  function renderExportReminderModal(targetCtx, view) {
    const width = Math.min(540, view.contentWidth - 80);
    const height = 420;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    // 标题加大，正文下移避免与标题视觉重叠
    const titleSize = 32;
    const titleY = y + 44;
    drawText(targetCtx, "备份一下存档？", x + width / 2, titleY, titleSize, "#d8aa95", "700", "center");
    const pad = 26;
    const textW = width - pad * 2;
    const titleBlock = Math.round(titleSize * 1.2) + 18;
    const yBody = titleY + titleBlock;
    // 使用 drawParagraph 自动换行（drawTextFitted 只会单行缩放，无法折行，会溢出）
    const mainText = "进度只保存在本浏览器的本地空间里，清理缓存或换设备可能丢失。建议经常把 JSON 存到网盘或发给自己邮箱。";
    const hMain = drawParagraph(targetCtx, mainText, x + pad, yBody, textW, 21, "#fff5e8", 29, { weight: "500" });
    drawParagraph(
      targetCtx,
      "点「导出存档」即可下载备份；点「稍后再说」则今日不再弹出。",
      x + pad,
      yBody + hMain + 16,
      textW,
      20,
      "#e8d4c8",
      27,
      { weight: "500" }
    );
    const btnW = (width - 52 - 18) / 2;
    const btnY = y + height - 86;
    drawButton(targetCtx, x + 26, btnY, btnW, 56, "导出存档", "green");
    drawButton(targetCtx, x + 26 + btnW + 18, btnY, btnW, 56, "稍后再说", "paper");
    registerRegion(overlayRegions, x + 26, btnY, btnW, 56, exportSaveToFile);
    registerRegion(overlayRegions, x + 26 + btnW + 18, btnY, btnW, 56, dismissExportReminderModal);
  }

  function renderImportConfirmModal(targetCtx, view) {
    const width = Math.min(520, view.contentWidth - 80);
    const height = 260;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "导入存档", x + width / 2, y + 26, 18, "#d8aa95", "500", "center");
    drawPixelText(targetCtx, "确认导入存档吗？", x + 26, y + 60, { size: 24, color: "#fff5e8", font: "sans-serif" });
    drawTextFitted(targetCtx, "将从本地 JSON 文件读取存档，并覆盖当前进度。建议先导出备份。", x + 26, y + 104, width - 52, 18, "#fff5e8", "500", "left", 12);
    const btnW = (width - 52 - 18) / 2;
    const btnY = y + height - 86;
    drawButton(targetCtx, x + 26, btnY, btnW, 56, "确定", "green");
    drawButton(targetCtx, x + 26 + btnW + 18, btnY, btnW, 56, "取消", "red");
    registerRegion(overlayRegions, x + 26, btnY, btnW, 56, beginImportSaveFromFile);
    registerRegion(overlayRegions, x + 26 + btnW + 18, btnY, btnW, 56, function () { setModal(null); });
  }

  function resetAllData() {
    try {
      const fresh = normalizeState(createDefaultState());
      // 初始化时强制使用默认系统配色（当前为传统原木）
      fresh.uiTheme = DEFAULT_UI_THEME;
      state = fresh;
      state.logs = [];
      applyUiTheme(state.uiTheme);
      state.resetCount = (state.resetCount || 0) + 1;
      unlockAchievement("misc_reset_once");
      saveState();
      setToast("数据已初始化，回到初始存档。", "success");
      setModal(null);
      renderApp();
    } catch (error) {
      console.error("resetAllData failed", error);
      setToast("数据初始化失败。", "danger");
      renderApp();
    }
  }

  function renderResetConfirmModal(targetCtx, view) {
    const width = Math.min(520, view.contentWidth - 80);
    const height = 260;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "数据初始化", x + width / 2, y + 26, 18, "#d8aa95", "500", "center");
    drawPixelText(targetCtx, "确认进行数据初始化？", x + 26, y + 60, { size: 24, color: "#fff5e8", font: "sans-serif" });
    drawTextFitted(targetCtx, "将清空当前存档并恢复为初始状态，此操作不可撤销。请先导出备份。", x + 26, y + 104, width - 52, 18, "#fff5e8", "500", "left", 12);
    const btnW = (width - 52 - 18) / 2;
    const btnY = y + height - 86;
    drawButton(targetCtx, x + 26, btnY, btnW, 56, "确定", "red");
    drawButton(targetCtx, x + 26 + btnW + 18, btnY, btnW, 56, "取消", "paper");
    registerRegion(overlayRegions, x + 26, btnY, btnW, 56, resetAllData);
    registerRegion(overlayRegions, x + 26 + btnW + 18, btnY, btnW, 56, function () { setModal(null); });
  }

  function renderDeleteCompletedTodoConfirmModal(targetCtx, view) {
    const modal = state.modal || {};
    const count = Math.max(0, Number(modal.count) || completedTodoCount());
    const width = Math.min(560, view.contentWidth - 80);
    const height = 280;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "批量删除待办", x + width / 2, y + 26, 18, "#d8aa95", "500", "center");
    drawPixelText(targetCtx, "确认删除已完成 To-do 吗？", x + 26, y + 60, { size: 24, color: "#fff5e8", font: "sans-serif" });
    drawTextFitted(targetCtx, "当前会删除 " + count + " 个已完成待办，此操作不可撤销。", x + 26, y + 104, width - 52, 18, "#fff5e8", "500", "left", 12);
    drawTextFitted(targetCtx, "如果只是暂时不想看，也可以继续使用右侧的显示/隐藏按钮。", x + 26, y + 138, width - 52, 18, "#e8d4c8", "500", "left", 12);
    const btnW = (width - 52 - 18) / 2;
    const btnY = y + height - 86;
    drawButton(targetCtx, x + 26, btnY, btnW, 56, "确认删除", "red");
    drawButton(targetCtx, x + 26 + btnW + 18, btnY, btnW, 56, "取消", "paper");
    registerRegion(overlayRegions, x + 26, btnY, btnW, 56, deleteCompletedTodoTasks);
    registerRegion(overlayRegions, x + 26 + btnW + 18, btnY, btnW, 56, function () { setModal(null); });
  }

  function renderModeConfirmModal(targetCtx, view) {
    const modal = state.modal || {};
    const targetMode = modal.targetMode === "challenge" ? "challenge"
      : modal.targetMode === "game" ? "game"
      : modal.targetMode === "pureOn" ? "pureOn"
      : modal.targetMode === "pureOff" ? "pureOff"
      : "game";
    const width = Math.min(520, view.contentWidth - 80);
    const height = 260;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    let title;
    if (targetMode === "challenge") title = "切换到挑战模式";
    else if (targetMode === "game") title = "切换到游戏模式";
    else if (targetMode === "pureOn") title = "开启纯净模式";
    else title = "关闭纯净模式";
    drawText(targetCtx, title, x + width / 2, y + 30, 22, "#d8aa95", "600", "center");
    let line1;
    let line2;
    if (targetMode === "challenge") {
      line1 = "挑战模式会限制刷分行为，更接近真实节奏。";
      line2 = "确认开启挑战模式吗？";
    } else if (targetMode === "game") {
      line1 = "游戏模式下不限制完成频率，更自由地体验。";
      line2 = "确认返回游戏模式吗？";
    } else if (targetMode === "pureOn") {
      line1 = "纯净模式下，只能使用任务区，其他页面将暂时锁定。";
      line2 = "确认开启纯净模式，让自己专注于任务吗？";
    } else {
      line1 = "普通模式下，所有页面都会恢复正常访问。";
      line2 = "确认关闭纯净模式吗？";
    }
    drawTextFitted(targetCtx, line1, x + 30, y + 78, width - 60, 18, "#fff5e8", "500", "left", 12);
    drawTextFitted(targetCtx, line2, x + 30, y + 112, width - 60, 18, "#fff5e8", "600", "left", 12);
    const btnW = (width - 52 - 18) / 2;
    const btnY = y + height - 86;
    drawButton(targetCtx, x + 26, btnY, btnW, 56, "确定", "green");
    drawButton(targetCtx, x + 26 + btnW + 18, btnY, btnW, 56, "取消", "paper");
    registerRegion(overlayRegions, x + 26, btnY, btnW, 56, function () {
      if (targetMode === "challenge") state.challengeMode = true;
      else if (targetMode === "game") state.challengeMode = false;
      else if (targetMode === "pureOn") {
        state.pureMode = true;
        if (state.page !== "tasks") state.page = "tasks";
      } else if (targetMode === "pureOff") state.pureMode = false;
      saveState();
      setModal(null);
      renderApp();
    });
    registerRegion(overlayRegions, x + 26 + btnW + 18, btnY, btnW, 56, function () {
      setModal(null);
      renderApp();
    });
  }

  function renderRenameModal(targetCtx, view) {
    const modal = state.modal;
    const width = Math.min(460, view.contentWidth - 80);
    const height = 300;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, modal.target === "task" ? "修改任务名称" : "修改奖励名称", x + width / 2, y + 40, 24, THEME.ink, "700", "center");
    drawInputField(targetCtx, x + 28, y + 80, width - 56, 72, "新名称", getFieldValue("renameInput"), "输入新名称", "renameInput", false);
    const btnW = (width - 56 - 18) / 2;
    const btnY = y + height - 80;
    drawButton(targetCtx, x + 28, btnY, btnW, 56, "确定", "green");
    drawButton(targetCtx, x + 28 + btnW + 18, btnY, btnW, 56, "取消", "red");
    registerRegion(overlayRegions, x + 28, btnY, btnW, 56, confirmRename);
    registerRegion(overlayRegions, x + 28 + btnW + 18, btnY, btnW, 56, function () { setModal(null); renderApp(); });
  }

  function drawPixelPlusGlyph(targetCtx, x, y, size, color) {
    const s = Math.max(16, Math.floor(size));
    const thickness = Math.max(3, Math.round(s / 5));
    const half = Math.floor(s / 2) - thickness;
    const cx = x + s / 2;
    const cy = y + s / 2;
    fillRect(targetCtx, cx - thickness / 2, cy - half, thickness, half * 2, color);
    fillRect(targetCtx, cx - half, cy - thickness / 2, half * 2, thickness, color);
  }

  function drawPixelTriangleGlyph(targetCtx, x, y, size, direction, color, shadowColor) {
    const pattern = direction === "right"
      ? ["0000100", "0000110", "0000111", "0000111", "0000111", "0000110", "0000100"]
      : ["0010000", "0110000", "1110000", "1110000", "1110000", "0110000", "0010000"];
    const scale = Math.max(2, Math.floor(size / 7));
    const glyphW = 7 * scale;
    const glyphH = 7 * scale;
    const originX = Math.round(x + (size - glyphW) / 2);
    const originY = Math.round(y + (size - glyphH) / 2);

    function drawPattern(ox, oy, fillColor) {
      pattern.forEach(function (row, rowIndex) {
        String(row).split("").forEach(function (cell, colIndex) {
          if (cell !== "1") return;
          fillRect(targetCtx, originX + ox + colIndex * scale, originY + oy + rowIndex * scale, scale, scale, fillColor);
        });
      });
    }

    if (shadowColor) drawPattern(scale, scale, shadowColor);
    drawPattern(0, 0, color);
  }

  function shiftCreateChallengeCalendarMonth(delta) {
    const modal = state.modal;
    if (!modal || modal.type !== "createChallenge") return;
    ensureCreateChallengeModalDefaults(modal);
    let year = modal.deadlineCalendarYear;
    let month = modal.deadlineCalendarMonth + delta;
    while (month < 1) {
      month += 12;
      year -= 1;
    }
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    modal.deadlineCalendarYear = Math.max(2024, year);
    modal.deadlineCalendarMonth = month;
    renderApp();
  }

  function selectCreateChallengeCalendarDay(dayValue) {
    const modal = state.modal;
    if (!modal || modal.type !== "createChallenge") return;
    ensureCreateChallengeModalDefaults(modal);
    modal.deadlineYear = modal.deadlineCalendarYear;
    modal.deadlineMonth = modal.deadlineCalendarMonth;
    modal.deadlineDay = clamp(dayValue, 1, daysInMonthLocal(modal.deadlineYear, modal.deadlineMonth));
    renderApp();
  }

  function toggleCreateChallengeDeadlineMode() {
    const modal = state.modal;
    if (!modal || modal.type !== "createChallenge") return;
    ensureCreateChallengeModalDefaults(modal);
    modal.hasDeadline = !modal.hasDeadline;
    if (!modal.hasDeadline && activeInput && (activeInput.fieldKey === "createChallengeDeadlineHour" || activeInput.fieldKey === "createChallengeDeadlineMinute")) blurActiveInput();
    renderApp();
  }

  function renderCreateChallengeCalendar(targetCtx, x, y, width, height, modal) {
    const headerPad = 16;
    const navY = y + 16;
    const monthLabel = modal.deadlineCalendarYear + "年" + pad2(modal.deadlineCalendarMonth) + "月";
    const previewHour = parseCreateChallengeTimeText(modal.deadlineHourText, 23);
    const previewMinute = parseCreateChallengeTimeText(modal.deadlineMinuteText, 59);
    const selectedLabel = modal.deadlineYear + "-" + pad2(modal.deadlineMonth) + "-" + pad2(modal.deadlineDay)
      + " " + (previewHour == null ? "??" : pad2(previewHour))
      + ":" + (previewMinute == null ? "??" : pad2(previewMinute));
    const weekLabels = ["一", "二", "三", "四", "五", "六", "日"];
    const firstDayIndex = (new Date(modal.deadlineCalendarYear, modal.deadlineCalendarMonth - 1, 1).getDay() + 6) % 7;
    const totalDays = daysInMonthLocal(modal.deadlineCalendarYear, modal.deadlineCalendarMonth);
    const gridTop = y + 78;
    const gap = width <= 400 ? 3 : 4;
    const cellW = Math.floor((width - headerPad * 2 - gap * 6) / 7);
    const cellH = Math.max(24, Math.floor((height - 92 - gap * 5) / 6));
    const dayFontSize = clamp(Math.floor(Math.min(cellW * 0.62, cellH * 0.86)), 16, 25);
    const dayMinFont = Math.max(14, dayFontSize - 5);
    const today = new Date();
    drawCard(targetCtx, x, y, width, height, THEME.paper);
    drawText(targetCtx, "截止日历", x + 18, y + 14, 16, THEME.inkSoft, "500");
    drawTextFitted(targetCtx, "已选：" + selectedLabel, x + 18, y + 36, width - 180, 18, THEME.ink, "600", "left", 12);
    drawButton(targetCtx, x + width - 118, navY, 44, 36, "<", "paper", { small: true });
    drawButton(targetCtx, x + width - 60, navY, 44, 36, ">", "paper", { small: true });
    registerRegion(overlayRegions, x + width - 118, navY, 44, 36, function () { shiftCreateChallengeCalendarMonth(-1); });
    registerRegion(overlayRegions, x + width - 60, navY, 44, 36, function () { shiftCreateChallengeCalendarMonth(1); });
    drawText(targetCtx, monthLabel, x + width - 132, y + 18, 16, THEME.inkSoft, "600", "right");
    weekLabels.forEach(function (label, index) {
      const cellX = x + headerPad + index * (cellW + gap);
      drawText(targetCtx, label, cellX + cellW / 2, y + 56, 15, THEME.inkSoft, "600", "center");
    });
    for (let index = 0; index < 42; index += 1) {
      const dayNumber = index - firstDayIndex + 1;
      const row = Math.floor(index / 7);
      const col = index % 7;
      const cellX = x + headerPad + col * (cellW + gap);
      const cellY = gridTop + row * (cellH + gap);
      const inMonth = dayNumber >= 1 && dayNumber <= totalDays;
      if (!inMonth) {
        drawCard(targetCtx, cellX, cellY, cellW, cellH, THEME.paperMuted);
        continue;
      }
      const selected = modal.deadlineYear === modal.deadlineCalendarYear
        && modal.deadlineMonth === modal.deadlineCalendarMonth
        && modal.deadlineDay === dayNumber;
      drawButton(targetCtx, cellX, cellY, cellW, cellH, String(dayNumber), selected ? "yellow" : "paper", {
        small: true,
        active: selected,
        fontSize: dayFontSize,
        minFontSize: dayMinFont
      });
      if (!selected
        && today.getFullYear() === modal.deadlineCalendarYear
        && (today.getMonth() + 1) === modal.deadlineCalendarMonth
        && today.getDate() === dayNumber) {
        targetCtx.strokeStyle = THEME.yellowShadow;
        targetCtx.lineWidth = 2;
        targetCtx.strokeRect(cellX + 2, cellY + 2, cellW - 4, cellH - 4);
      }
      registerRegion(overlayRegions, cellX, cellY, cellW, cellH, function () { selectCreateChallengeCalendarDay(dayNumber); });
    }
  }

  function renderCreateChallengeModal(targetCtx, view) {
    const modal = state.modal;
    ensureCreateChallengeModalDefaults(modal);
    const phoneLayout = view.width <= 640;
    const calendarHeight = phoneLayout ? 270 : 248;
    const width = Math.min(760, view.contentWidth - (phoneLayout ? 24 : 80));
    const height = modal.bucket === "todo" ? (modal.hasDeadline ? (534 + calendarHeight) : 560) : 460;
    const x = view.left + (view.contentWidth - width) / 2;
    const y = Math.max(phoneLayout ? 14 : 30, (view.logicalHeight - height) / 2);
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "建立新的挑战", x + 34, y + 44, 24, "#fff0dd", "700");
    drawText(targetCtx, modal.bucket === "todo" ? "To-do 可选截止日期，习惯和技能不需要" : "待办 / 习惯 / 技能", x + 34, y + 78, 16, "#d8aa95", "500");
    drawButton(targetCtx, x + width - 112, y + 28, 78, 62, "关闭", "red", { small: true });
    registerRegion(overlayRegions, x + width - 112, y + 28, 78, 62, function () { setModal(null); renderApp(); });

    const left = x + 34;
    const innerW = width - 68;
    const cardY = y + 112;
    const fieldGap = 18;
    const availableW = innerW - 36;
    const halfFieldW = Math.floor((availableW - fieldGap) / 2);
    const cardHeight = modal.bucket === "todo" ? (modal.hasDeadline ? (320 + calendarHeight) : 340) : 220;
    drawCard(targetCtx, left, cardY, innerW, cardHeight, THEME.paper);
    drawInputField(targetCtx, left + 18, cardY + 18, innerW - 36, 72, "挑战名称", getFieldValue("createChallengeTitle"), "例如：整理桌面", "createChallengeTitle", false);

    const secondRowY = cardY + 118;
    drawSelectorField(targetCtx, left + 18, secondRowY, halfFieldW, 72, "类型", (TASK_BUCKET_OPTIONS[modal.bucket] || TASK_BUCKET_OPTIONS.todo).selector, function () {
      const order = ["todo", "habit", "learn"];
      const idx = Math.max(0, order.indexOf(modal.bucket));
      modal.bucket = order[(idx + 1) % order.length];
      if (modal.bucket !== "todo" && activeInput && (activeInput.fieldKey === "createChallengeDeadlineHour" || activeInput.fieldKey === "createChallengeDeadlineMinute")) blurActiveInput();
      renderApp();
    });
    drawSelectorField(targetCtx, left + 18 + halfFieldW + fieldGap, secondRowY, halfFieldW, 72, "难度", DIFFICULTIES[modal.difficulty] ? DIFFICULTIES[modal.difficulty].label : DIFFICULTIES.normal.label, function () {
      modal.difficulty = cycleValue(DIFFICULTY_ORDER, modal.difficulty);
      renderApp();
    });

    if (modal.bucket === "todo") {
      const deadlineRowY = secondRowY + 96;
      if (modal.hasDeadline) {
        const modeW = Math.max(180, Math.floor(availableW * 0.36));
        const timeFieldW = Math.floor((availableW - modeW - fieldGap * 2) / 2);
        drawSelectorField(targetCtx, left + 18, deadlineRowY, modeW, 72, "截止日期", "有", toggleCreateChallengeDeadlineMode);
        drawInputField(targetCtx, left + 18 + modeW + fieldGap, deadlineRowY, timeFieldW, 72, "小时", getFieldValue("createChallengeDeadlineHour"), "09", "createChallengeDeadlineHour", true);
        drawInputField(targetCtx, left + 18 + modeW + fieldGap + timeFieldW + fieldGap, deadlineRowY, timeFieldW, 72, "分钟", getFieldValue("createChallengeDeadlineMinute"), "30", "createChallengeDeadlineMinute", true);
        renderCreateChallengeCalendar(targetCtx, left + 18, deadlineRowY + 102, innerW - 36, calendarHeight, modal);
      } else {
        drawSelectorField(targetCtx, left + 18, deadlineRowY, innerW - 36, 72, "截止日期", "无", toggleCreateChallengeDeadlineMode);
        drawTextFitted(targetCtx, "选择“有”后，可用日历设置日期和具体时间。", left + 18, deadlineRowY + 108, innerW - 36, 16, THEME.inkSoft, "500", "left", 12);
      }
    }

    const btnW = (width - 68 - 18) / 2;
    const btnY = y + height - 86;
    drawButton(targetCtx, x + 34, btnY, btnW, 56, "加入挑战", "green");
    drawButton(targetCtx, x + 34 + btnW + 18, btnY, btnW, 56, "取消", "paper");
    registerRegion(overlayRegions, x + 34, btnY, btnW, 56, confirmCreateChallenge);
    registerRegion(overlayRegions, x + 34 + btnW + 18, btnY, btnW, 56, function () { setModal(null); renderApp(); });
  }

  function renderCreateRewardModal(targetCtx, view) {
    const width = Math.min(720, view.contentWidth - 80);
    const height = 440;
    const x = (view.logicalWidth - width) / 2;
    const y = (view.logicalHeight - height) / 2;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "建立新的奖励", x + 34, y + 44, 24, "#fff0dd", "700");
    drawText(targetCtx, "会出现在休整区的兑换列表里", x + 34, y + 78, 16, "#d8aa95", "500");
    drawButton(targetCtx, x + width - 112, y + 28, 78, 62, "关闭", "red", { small: true });
    registerRegion(overlayRegions, x + width - 112, y + 28, 78, 62, function () { setModal(null); renderApp(); });

    const left = x + 34;
    const innerW = width - 68;
    const cardY = y + 116;
    drawCard(targetCtx, left, cardY, innerW, 200, THEME.paper);
    drawInputField(targetCtx, left + 18, cardY + 18, innerW - 36, 72, "奖励名", getFieldValue("createRewardName"), "例如：喝奶茶", "createRewardName", false);
    drawInputField(targetCtx, left + 18, cardY + 122, innerW - 36, 72, "价格", getFieldValue("createRewardPrice"), "20", "createRewardPrice", true);

    const btnW = (width - 68 - 18) / 2;
    const btnY = y + height - 86;
    drawButton(targetCtx, x + 34, btnY, btnW, 56, "添加奖励", "yellow");
    drawButton(targetCtx, x + 34 + btnW + 18, btnY, btnW, 56, "取消", "paper");
    registerRegion(overlayRegions, x + 34, btnY, btnW, 56, confirmCreateReward);
    registerRegion(overlayRegions, x + 34 + btnW + 18, btnY, btnW, 56, function () { setModal(null); renderApp(); });
  }

  function drawPomodoroVsPixel(targetCtx, x, y, size, color) {
    const scale = bitmapScaleForSize(size);
    const gap = scale;
    const glyphs = {
      V: ["10001", "10001", "10001", "10001", "01010", "01010", "00100"],
      S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
    };

    const glyphW = 5 * scale;
    const glyphH = 7 * scale;
    const totalW = glyphW + gap + glyphW;
    const startX = Math.round(x - totalW / 2);
    const startY = Math.round(y + Math.max(0, (Math.round(size * 1.1) - glyphH) / 2));

    function drawGlyph(pattern, ox) {
      for (let row = 0; row < pattern.length; row += 1) {
        const line = pattern[row];
        for (let col = 0; col < line.length; col += 1) {
          if (line[col] !== "1") continue;
          fillRect(targetCtx, startX + ox + col * scale, startY + row * scale, scale, scale, color);
        }
      }
    }

    drawGlyph(glyphs.V, 0);
    drawGlyph(glyphs.S, glyphW + gap);
  }

  function renderPomodoroModal(targetCtx, view) {
    const modal = state.modal;
    const width = Math.min(1180, view.contentWidth - 60);
    const fullHeight = 940;
    const height = Math.min(fullHeight, view.logicalHeight - 40);
    const padding = 20;
    const headerH = 96;
    const maxScroll = Math.max(0, fullHeight - height);
    const scroll = clamp(modal.scroll || 0, 0, maxScroll);
    modal.scroll = scroll;
    modal.maxScroll = maxScroll;

    const defaultX = (view.logicalWidth - width) / 2;
    const defaultY = Math.max(padding, (view.logicalHeight - height) / 2);
    const desiredX = modal.position && typeof modal.position.x === "number" ? modal.position.x : defaultX;
    const desiredY = modal.position && typeof modal.position.y === "number" ? modal.position.y : defaultY;
    const x = clamp(desiredX, padding, view.logicalWidth - width - padding);
    const y = clamp(desiredY, padding, view.logicalHeight - height - padding);
    modal.position = { x: x, y: y };
    overlayModalLayout = {
      type: "pomodoro",
      x: x,
      y: y,
      width: width,
      height: height,
      header: { x: x, y: y, width: width, height: headerH },
      scrollArea: { x: x + 12, y: y + headerH, width: width - 24, height: height - headerH - 12 }
    };

    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "番茄战斗", x + 34, y + 28, 18, "#d8aa95", "500");
    drawText(targetCtx, modal.title, x + 34, y + 64, 34, "#fff0dd", "700");
    drawButton(targetCtx, x + width - 108, y + 24, 74, 62, "关闭", "red", { small: true });
    registerRegion(overlayRegions, x + width - 108, y + 24, 74, 62, function () { setModal(null); });

    const clipX = x + 12;
    const clipY = y + headerH;
    const clipW = width - 24;
    const clipH = height - headerH - 12;
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(clipX, clipY, clipW, clipH);
    targetCtx.clip();

    const oy = -scroll;
    const battleCardX = x + 26;
    const battleCardY = y + 110 + oy;
    const battleCardW = width - 52;
    const battleCardH = 320;
    const battleGap = width <= 420 ? 8 : (width <= 560 ? 10 : 18);
    const battleVsSize = clamp(Math.floor(battleCardW * (width <= 420 ? 0.11 : (width <= 560 ? 0.12 : 0.1))), width <= 420 ? 36 : 44, 70);
    const spriteSize = Math.max(40, Math.min(210, Math.floor((battleCardW - battleGap * 2 - battleVsSize) / 2)));
    const battleGroupW = spriteSize * 2 + battleGap * 2 + battleVsSize;
    const battleGroupX = battleCardX + Math.max(0, Math.floor((battleCardW - battleGroupW) / 2));
    const heroSpriteX = battleGroupX;
    const bossSpriteX = battleGroupX + spriteSize + battleGap * 2 + battleVsSize;
    const spriteY = battleCardY + Math.max(18, Math.floor((battleCardH - spriteSize) / 2) - 8);
    const vsCenterX = battleGroupX + spriteSize + battleGap + battleVsSize / 2;
    const vsCenterY = spriteY + spriteSize / 2;
    drawCard(targetCtx, battleCardX, battleCardY, battleCardW, battleCardH, THEME.paper);
    drawSpriteFrame(targetCtx, getCharacterSprite(state.profile.appearance, 72), heroSpriteX, spriteY, spriteSize);
    drawPomodoroVsPixel(targetCtx, vsCenterX, vsCenterY, battleVsSize, THEME.ink);
    drawSpriteFrame(targetCtx, getBossSprite(currentBossTemplate().kind, 72), bossSpriteX, spriteY, spriteSize);
    const adventurerName = String((state.profile && state.profile.name) || HERO_ROLE || "冒险者").trim() || "冒险者";
    const battleCaptionY = y + 374 + oy;
    drawTextFitted(targetCtx, adventurerName + "，专注来打败怪物", x + width / 2, battleCaptionY, width - 140, 24, THEME.inkSoft, "600", "center", 14);
    drawCard(targetCtx, x + 26, y + 452 + oy, width - 52, 430, THEME.paper);
    drawInputField(targetCtx, x + 50, y + 474 + oy, width - 100, 70, "自定义时长（分钟）", String(modal.durationMinutes), "25", "pomodoroMinutes", true);
    fillRect(targetCtx, x + 54, y + 594 + oy, width - 108, 130, THEME.frameDark);
    drawPixelText(targetCtx, formatClock(modal.remainingSeconds), x + width / 2, y + 630 + oy, { size: 54, color: "#f7e27f", align: "center", font: "sans-serif" });
    drawText(targetCtx, modal.running ? "专注进行中" : modal.remainingSeconds === 0 ? "计时完成，可以结算任务。" : "准备开始专注", x + width / 2, y + 750 + oy, 18, THEME.inkSoft, "500", "center");
    const buttonGap = 16;
    const buttonW = (width - 100 - buttonGap) / 2;
    drawButton(targetCtx, x + 50, y + 778 + oy, buttonW, 64, "开始", modal.running ? "disabled" : "green", { small: true, disabled: modal.running });
    drawButton(targetCtx, x + 50 + buttonW + buttonGap, y + 778 + oy, buttonW, 64, "暂停", modal.running ? "yellow" : "disabled", { small: true, disabled: !modal.running });
    drawButton(targetCtx, x + 50, y + 856 + oy, buttonW, 64, "重置", "red", { small: true });
    drawButton(targetCtx, x + 50 + buttonW + buttonGap, y + 856 + oy, buttonW, 64, "完成任务", "lilac", { small: true });
    if (!modal.running) registerRegion(overlayRegions, x + 50, y + 778 + oy, buttonW, 64, startPomodoro);
    if (modal.running) registerRegion(overlayRegions, x + 50 + buttonW + buttonGap, y + 778 + oy, buttonW, 64, pausePomodoro);
    registerRegion(overlayRegions, x + 50, y + 856 + oy, buttonW, 64, resetPomodoro);
    registerRegion(overlayRegions, x + 50 + buttonW + buttonGap, y + 856 + oy, buttonW, 64, finishPomodoro);

    targetCtx.restore();

    if (maxScroll > 0) {
      fillRect(targetCtx, x + width - 28, clipY, 8, clipH, "#5c342d");
      const thumbH = Math.max(60, clipH * (clipH / (clipH + maxScroll)));
      const thumbY = clipY + ((clipH - thumbH) * (scroll / maxScroll));
      fillRect(targetCtx, x + width - 30, thumbY, 12, thumbH, THEME.yellow);
      targetCtx.strokeStyle = THEME.black;
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(x + width - 30, thumbY, 12, thumbH);
    }
  }

  function renderTreasureModal(targetCtx, view) {
    const modal = state.modal;
    const rewards = modal.rewards && modal.rewards.length ? modal.rewards : [{ label: modal.rewardLabel, detail: modal.subtitle }];
    const rewardPhase = modal.phase || "rewards";
    const listHeight = rewards.length * 74;
    const height = rewardPhase === "chest" ? 420 : Math.min(view.logicalHeight - 80, Math.max(420, 228 + listHeight));
    const width = Math.min(980, view.contentWidth - 80);
    const x = (view.logicalWidth - width) / 2;
    const y = Math.max(40, (view.logicalHeight - height) / 2);
    fillRect(targetCtx, x, y, width, height, "#6b4a63");
    fillRect(targetCtx, x + 16, y + 16, width - 32, height - 32, "#a9889e");
    targetCtx.strokeStyle = THEME.black;
    targetCtx.lineWidth = 6;
    targetCtx.strokeRect(x, y, width, height);
    targetCtx.strokeRect(x + 16, y + 16, width - 32, height - 32);
    drawPixelText(targetCtx, "Treasure Drop", x + width / 2, y + 34, { size: 18, color: "#f5f2f8", align: "center", font: "sans-serif" });
    if (rewardPhase === "chest") {
      drawTextFitted(targetCtx, modal.title || "任务宝箱", x + width / 2, y + 78, width - 120, 46, "#fff9ff", "700", "center", 24);
      drawSpriteFrame(targetCtx, getTreasureSprite(48), x + width / 2 - 72, y + 126, 144);
      drawTextFitted(targetCtx, modal.rewardLabel || "宝箱掉落", x + width / 2, y + 280, width - 140, 28, "#fff7ef", "600", "center", 18);
      drawTextFitted(targetCtx, modal.subtitle || "点击领取奖励。", x + width / 2, y + 324, width - 140, 18, "#f7f0f7", "500", "center", 14);
      drawButton(targetCtx, x + width / 2 - 84, y + 358, 168, 52, "领取奖励", "green", { small: true });
      registerRegion(overlayRegions, x + width / 2 - 84, y + 358, 168, 52, advanceTreasureModal);
      return;
    }
    drawTextFitted(targetCtx, "获得的奖励", x + width / 2, y + 74, width - 120, 42, "#fff9ff", "700", "center", 24);
    let cursorY = y + 116;
    rewards.forEach(function (entry) {
      drawCard(targetCtx, x + 48, cursorY, width - 96, 58, "#f1e5ec");
      drawTextFitted(targetCtx, entry.label, x + 74, cursorY + 16, width - 148, 24, THEME.ink, "700", "left", 16);
      if (entry.detail) drawTextFitted(targetCtx, entry.detail, x + 74, cursorY + 40, width - 148, 15, THEME.inkSoft, "500", "left", 11);
      cursorY += 74;
    });
    drawButton(targetCtx, x + width / 2 - 84, y + height - 62, 168, 52, "收下奖励", "green", { small: true });
    registerRegion(overlayRegions, x + width / 2 - 84, y + height - 62, 168, 52, advanceTreasureModal);
  }

  function renderAdventureStoryModal(targetCtx, view) {
    const modal = state.modal || {};
    const width = Math.min(760, view.contentWidth - 80);
    const height = 372;
    const x = (view.logicalWidth - width) / 2;
    const y = Math.max(40, (view.logicalHeight - height) / 2);
    const location = ADVENTURE_LOCATIONS.find(function (entry) { return entry.id === modal.locationId; });
    const companion = modal.companionId ? companionById(modal.companionId) : null;
    const sceneName = modal.sceneName || modal.locationName || (location && location.scene) || "归途";
    const story = modal.story || buildAdventureStory(location, { locationName: sceneName });
    const sprite = companion
      ? getCompanionSceneSprite(companion, sceneName, 108)
      : (location ? getSceneSprite(location.scene, 48) : getTreasureSprite(48));
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, companion ? "伙伴邂逅" : "冒险见闻", x + 34, y + 30, 18, "#d8aa95", "500");
    drawTextFitted(targetCtx, companion ? ("在" + sceneName + "遇见了" + companion.name) : sceneName, x + 34, y + 58, width - 68, 32, "#fff0dd", "700", "left", 18);
    drawCard(targetCtx, x + 30, y + 106, width - 60, 154, THEME.paper);
    drawSpriteFrame(targetCtx, sprite, x + 46, y + 126, 108);
    drawParagraph(targetCtx, story, x + 178, y + 138, width - 226, 20, THEME.ink, 32, { weight: "600", maxLines: 3 });
    drawButton(targetCtx, x + width / 2 - 84, y + height - 86, 168, 56, "知道了", "green", { small: true });
    registerRegion(overlayRegions, x + width / 2 - 84, y + height - 86, 168, 56, acknowledgeAdventureStory);
  }

  function renderCompanionGiftShopModal(targetCtx, view) {
    const modal = state.modal || {};
    const companion = companionById(modal.companionId);
    const items = companionGiftShopItems();
    const width = Math.min(1080, view.contentWidth - 60);
    const height = Math.min(780, view.logicalHeight - 40);
    const x = view.left + (view.contentWidth - width) / 2;
    const y = Math.max(20, (view.logicalHeight - height) / 2);
    const singleColumn = width < 760;
    const columns = singleColumn ? 1 : 2;
    const cardW = singleColumn ? (width - 56) : ((width - 84) / 2);
    const cardH = singleColumn ? 214 : 150;
    const rowGap = singleColumn ? 18 : 26;
    const gridTopY = y + 120;
    const pagerReserve = 112;
    const listBottomPadding = 26;
    const availableListH = Math.max(1, height - (gridTopY - y) - pagerReserve - listBottomPadding);
    const rowsPerPage = Math.max(1, Math.floor((availableListH + rowGap) / (cardH + rowGap)));
    const perPage = Math.max(1, rowsPerPage * columns);
    modal.giftShopPerPage = perPage;
    const maxPage = Math.max(0, Math.ceil(items.length / perPage) - 1);
    const currentPage = clamp(Number(modal.page) || 0, 0, maxPage);
    const pageItems = items.slice(currentPage * perPage, currentPage * perPage + perPage);
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, companion ? (companion.name + " 的送礼商店") : "送礼商店", x + 34, y + 40, 26, "#fff0dd", "700");
    drawTextFitted(targetCtx, "只有已经在图鉴中解锁的礼物才能购买并赠送，未解锁的会显示为灰色。", x + 34, y + 76, width - 180, 16, "#d8aa95", "500", "left", 12);
    drawButton(targetCtx, x + width - 112, y + 24, 78, 56, "关闭", "red", { small: true });
    registerRegion(overlayRegions, x + width - 112, y + 24, 78, 56, function () { setModal(null); });
    pageItems.forEach(function (item, index) {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const cardX = x + 28 + col * (cardW + 20);
      const cardY = gridTopY + row * (cardH + rowGap);
      const codexUnlocked = codexEntryUnlocked(codexKey(codexKindForItemCategory(item.category), item.id));
      const enoughGold = state.profile.gold >= item.price;
      const requiredLevel = itemRequiredLevel(item);
      const canBuy = codexUnlocked && enoughGold && (state.profile.level || 1) >= requiredLevel;
      let label = "购买并赠送";
      if (!codexUnlocked) label = "未解锁";
      else if ((state.profile.level || 1) < requiredLevel) label = "Lv" + requiredLevel + " 可购";
      else if (!enoughGold) label = "金币不足";
      drawCard(targetCtx, cardX, cardY, cardW, cardH, THEME.paper);
      if (singleColumn) {
        drawSpriteFrame(targetCtx, getCatalogPreview(item, 48), cardX + 18, cardY + 18, 92, itemRarityFrameColor(item));
        drawTextFitted(targetCtx, CATEGORY_LABELS[item.category] + "  •  " + itemRarityLabel(item), cardX + 126, cardY + 18, cardW - 144, 18, THEME.inkSoft, "500", "left", 12);
        drawTextFitted(targetCtx, item.name + "  •  " + item.price + " 金币", cardX + 126, cardY + 50, cardW - 144, 22, THEME.ink, "700", "left", 12);
        drawParagraph(targetCtx, item.description, cardX + 18, cardY + 116, cardW - 36, 15, THEME.inkSoft, 18, { maxLines: 2 });
        drawButton(targetCtx, cardX + 18, cardY + cardH - 54, cardW - 36, 40, label, canBuy ? "yellow" : "disabled", {
          small: true,
          disabled: !canBuy,
          fontSize: 16,
          minFontSize: 11
        });
        if (canBuy && companion) registerRegion(overlayRegions, cardX + 18, cardY + cardH - 54, cardW - 36, 40, function () { buyGiftForCompanion(companion.id, item.id); });
      } else {
        drawSpriteFrame(targetCtx, getCatalogPreview(item, 48), cardX + 18, cardY + 18, 118, itemRarityFrameColor(item));
        drawText(targetCtx, CATEGORY_LABELS[item.category] + "  •  " + itemRarityLabel(item), cardX + 156, cardY + 18, 20, THEME.inkSoft, "500");
        drawTextFitted(targetCtx, item.name + "  •  " + item.price + " 金币", cardX + 156, cardY + 56, cardW - 310, 24, THEME.ink, "700", "left", 14);
        drawParagraph(targetCtx, item.description, cardX + 156, cardY + 92, cardW - 310, 16, THEME.inkSoft, 22, { maxLines: 2 });
        drawButton(targetCtx, cardX + cardW - 146, cardY + 38, 118, 64, label, canBuy ? "yellow" : "disabled", { small: true, disabled: !canBuy });
        if (canBuy && companion) registerRegion(overlayRegions, cardX + cardW - 146, cardY + 38, 118, 64, function () { buyGiftForCompanion(companion.id, item.id); });
      }
    });
    if (maxPage > 0) {
      const rowsUsed = Math.max(1, Math.ceil(pageItems.length / columns));
      const cardsBottomY = gridTopY + (rowsUsed - 1) * (cardH + rowGap) + cardH;
      const pagerY = Math.max(cardsBottomY + 18, y + height - 84);
      drawText(targetCtx, "第 " + (currentPage + 1) + " 页 / 共 " + (maxPage + 1) + " 页", x + width / 2, pagerY + 6, 16, "#d8aa95", "600", "center");
      drawButton(targetCtx, x + width / 2 - 132, pagerY + 22, 88, 40, "上一页", currentPage > 0 ? "pager" : "pagerDisabled", { small: true });
      drawButton(targetCtx, x + width / 2 + 44, pagerY + 22, 88, 40, "下一页", currentPage < maxPage ? "pager" : "pagerDisabled", { small: true });
      if (currentPage > 0) registerRegion(overlayRegions, x + width / 2 - 132, pagerY + 22, 88, 40, function () { shiftCompanionGiftShopPage(-1); });
      if (currentPage < maxPage) registerRegion(overlayRegions, x + width / 2 + 44, pagerY + 22, 88, 40, function () { shiftCompanionGiftShopPage(1); });
    }
  }

  function renderCodexModal(targetCtx, view) {
    const modal = state.modal || {};
    const phoneFullscreen = view.width <= 640;
    const width = phoneFullscreen ? Math.min(720, view.contentWidth - 8) : Math.min(1180, view.contentWidth - 60);
    const height = phoneFullscreen ? Math.max(420, view.logicalHeight - 12) : Math.min(750, view.logicalHeight - 80);
    const x = view.left + (view.contentWidth - width) / 2;
    const y = phoneFullscreen ? 6 : 40;
    const narrowLayout = width < 820;
    const leftRatio = 0.6;
    const gap = narrowLayout ? 18 : 24;
    const leftW = Math.floor(width * leftRatio);
    const headerH = 40;
    overlayModalLayout = { type: "codex", x: x, y: y, width: width, height: height, header: { x: x, y: y, width: width, height: headerH } };
    const codex = activeCodex();
    const showUnlockedOnly = Boolean(modal && modal.unlockedOnly);
    targetCtx.save();
    fillRect(targetCtx, x, y, width, height, THEME.paper);
    // 去掉顶部大标题与副标题，仅保留分类标签和关闭按钮
    // 关闭按钮（右上角，略微上移贴近边框）
    const closeW = 74;
    const closeH = 62;
    // 在前一次基础上再向上 10px
    const closeX = x + width - closeW - 14;
    const closeY = y - 4;
    drawButton(targetCtx, closeX, closeY, closeW, closeH, "关闭", "red", { small: true });
    registerRegion(overlayRegions, closeX, closeY, closeW, closeH, function () { setModal(null); });

    // 筛选：仅看已解锁
    const filterW = 150;
    const filterH = 50;
    const filterX = narrowLayout ? (x + 24) : (closeX - filterW - 16);
    const filterY = narrowLayout ? (y + 4) : y;
    const filterLabel = showUnlockedOnly ? "显示全部" : "仅看已解锁";
    drawButton(targetCtx, filterX, filterY, filterW, filterH, filterLabel, showUnlockedOnly ? "yellow" : "paper", {
      small: true,
      active: showUnlockedOnly,
      disabled: false,
    });
    registerRegion(overlayRegions, filterX, filterY, filterW, filterH, function () {
      setModal({ type: "codex", category: (modal && modal.category) || "all", selectedId: null, scroll: 0, unlockedOnly: !showUnlockedOnly });
    });
    const categories = [["all", "全部"], ["hair", "发型"], ["top", "上装"], ["bottom", "下装"], ["gear", "装备"], ["accessory", "配饰"], ["supply", "补给"], ["scene", "场景"], ["pet", "宠物"], ["boss", "Boss"], ["companion", "伙伴"]];
    const activeCategory = (modal && modal.category) || "all";
    let categoryBottomY;
    if (narrowLayout) {
      const chipCols = 3;
      const chipGapX = 12;
      const chipGapY = 12;
      const chipW = Math.floor((width - 48 - chipGapX * (chipCols - 1)) / chipCols);
      const chipH = 50;
      const catStartY = y + 66;
      categories.forEach(function (entry, index) {
        const row = Math.floor(index / chipCols);
        const col = index % chipCols;
        const chipX = x + 24 + col * (chipW + chipGapX);
        const chipY = catStartY + row * (chipH + chipGapY);
        const isActive = entry[0] === activeCategory;
        drawButton(targetCtx, chipX, chipY, chipW, chipH, entry[1], isActive ? "green" : "paper", { small: true, fontSize: 20, minFontSize: 14, active: isActive, disabled: isActive });
        if (!isActive) {
          registerRegion(overlayRegions, chipX, chipY, chipW, chipH, function () {
            setModal({ type: "codex", category: entry[0], selectedId: null, scroll: 0, unlockedOnly: showUnlockedOnly });
          });
        }
      });
      const chipRows = Math.ceil(categories.length / chipCols);
      categoryBottomY = catStartY + chipRows * chipH + Math.max(0, chipRows - 1) * chipGapY;
    } else {
      let catX = x + 26;
      const catY = y + headerH - 30;
      const chipH = 40;
      categories.forEach(function (entry) {
        const label = entry[1];
        const isActive = entry[0] === activeCategory;
        const chipW = Math.max(70, measureStyledTextWidth(targetCtx, label, 20, "600", null) + 26);
        drawButton(targetCtx, catX, catY, chipW, chipH, label, isActive ? "green" : "paper", { small: true, fontSize: 20, active: isActive, disabled: isActive });
        if (!isActive) {
          registerRegion(overlayRegions, catX, catY, chipW, chipH, function () {
            setModal({ type: "codex", category: entry[0], selectedId: null, scroll: 0, unlockedOnly: showUnlockedOnly });
          });
        }
        catX += chipW + 10;
      });
      categoryBottomY = y + headerH + 10;
    }
    const bodyY = categoryBottomY + 18;
    const bodyBottom = y + height - 18;
    const availableBodyH = Math.max(180, bodyBottom - bodyY);
    const leftX = x + 24;
    const leftY = bodyY;
    const leftWInner = narrowLayout ? (width - 48) : leftW;
    const mobileMinThumbH = narrowLayout ? Math.min(236, Math.max(188, availableBodyH - gap - 228)) : 0;
    const mobileDetailTargetH = narrowLayout
      ? clamp(Math.round(leftWInner * 0.75), 220, Math.max(220, availableBodyH - gap - mobileMinThumbH))
      : 0;
    const leftHInner = narrowLayout ? Math.max(mobileMinThumbH, availableBodyH - gap - mobileDetailTargetH) : availableBodyH;
    const rightX = narrowLayout ? leftX : (leftX + leftWInner + gap);
    const rightY = narrowLayout ? (leftY + leftHInner + gap) : bodyY;
    const rightW = narrowLayout ? leftWInner : (width - leftW - gap - 40);
    const rightH = narrowLayout ? (bodyBottom - rightY) : Math.max(150, bodyBottom - rightY);
    if (overlayModalLayout) overlayModalLayout.scrollArea = { x: leftX, y: leftY, width: leftWInner, height: leftHInner };
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(leftX, leftY, leftWInner, leftHInner);
    targetCtx.clip();
    const allEntries = (function () {
      const list = [];
      SHOP_CATALOG.forEach(function (item) {
        if (!item) return;
        const kind = codexKindForItemCategory(item.category);
        list.push({ id: codexKey(kind, item.id), kind: kind, key: item.id, name: item.name, entity: item });
      });
      // 初始条目：无条件加入列表
      INITIAL_CODEX_ITEMS.forEach(function (entry) {
        const initialId = codexKey(entry.kind, entry.key);
        const existing = list.find(function (item) { return item.id === initialId; });
        if (existing) existing.initial = true;
        else list.push({ id: initialId, kind: entry.kind, key: entry.key, name: entry.name, initial: true });
      });
      Object.keys(PET_SPECIES).forEach(function (species) {
        // 为每个物种补全所有成长阶段（包含幼年）
        for (let s = 0; s < PET_STAGES.length; s += 1) {
          const name = PET_SPECIES[species].name + "·" + PET_STAGES[s];
          list.push({ id: codexKey("pet", species + ":" + s), kind: "pet", key: species + ":" + s, name: name, species: species, stage: s });
        }
      });
      BOSS_ROTATION.forEach(function (boss) {
        list.push({ id: codexKey("boss", boss.id), kind: "boss", key: boss.id, name: boss.name, boss: boss });
      });
      COMPANIONS.forEach(function (companion) {
        list.push({ id: codexKey("companion", companion.id), kind: "companion", key: companion.id, name: companion.name, companion: companion });
      });
      return list;
    })();
    const filtered = allEntries
      .filter(function (entry) {
        if (activeCategory === "all") return true;
        return entry.kind === activeCategory;
      })
      .filter(function (entry) {
        if (!showUnlockedOnly) return true;
        const id = entry.id;
        const unlocked = Boolean(entry.initial) || Boolean(codex.items[id] && codex.items[id].unlocked);
        return unlocked;
      })
      .sort(function (a, b) {
      // 初始获得的条目永远排在最前面
      const aInitial = a.initial ? 1 : 0;
      const bInitial = b.initial ? 1 : 0;
      if (aInitial !== bInitial) return bInitial - aInitial;
      // 按稀有度/等级排序：廉价 < 普通 < 精良 < 稀有 < 史诗
      function rarityIndexFor(entry) {
        if (entry.entity) {
          const r = itemRarityLabel(entry.entity);
          return Math.max(0, ITEM_RARITY_LEVELS.indexOf(r));
        }
        if (entry.kind === "scene") {
          const sceneItem = catalogItemById(entry.key);
          const r = itemRarityLabel(sceneItem);
          return Math.max(0, ITEM_RARITY_LEVELS.indexOf(r));
        }
        if (entry.kind === "pet") {
          const eggItem = catalogPetEggBySpecies(entry.species);
          const r = petRarityLabel({ species: entry.species, rarity: eggItem && eggItem.rarity });
          return Math.max(0, ITEM_RARITY_LEVELS.indexOf(r));
        }
        if (entry.kind === "boss") {
          const bossItem = entry.boss && catalogItemById(entry.boss.backgroundRewardId || "");
          const r = itemRarityLabel(bossItem);
          return Math.max(0, ITEM_RARITY_LEVELS.indexOf(r));
        }
        if (entry.kind === "companion") return 1;
        return 0;
      }
      const ra = rarityIndexFor(a);
      const rb = rarityIndexFor(b);
      if (ra !== rb) return ra - rb;
      // 同一等级内部随意：用名称作稳定排序以保证从左到右再从上到下
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    const cardW = 148;
    const cardH = 132;
    const pad = 12;
    const perRow = Math.max(1, Math.floor((leftWInner - pad * 2) / (cardW + pad)));
    const scroll = clamp(Number(modal && modal.scroll) || 0, 0, Number(modal && modal.maxScroll) || 0);
    let offsetY = leftY + pad - scroll;
    filtered.forEach(function (entry, index) {
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      const cx = leftX + pad + col * (cardW + pad);
      const cy = offsetY + row * (cardH + pad);
      const id = entry.id;
      // 初始条目无条件视为已解锁
      const unlocked = Boolean(entry.initial) || Boolean(codex.items[id] && codex.items[id].unlocked);
      const frameSize = 76;
      const frameX = cx + (cardW - frameSize) / 2;
      const frameY = cy + 10;
      drawCard(targetCtx, cx, cy, cardW, cardH, THEME.paper);
      let sprite = null;
      let frameColor = null;
      let title = entry.name;
      if (entry.initial) {
        // 初始条目需要自行生成预览图
        frameColor = itemRarityFrameColor(entry.entity || { rarity: "廉价" });
        if (entry.kind === "scene") sprite = getSceneSprite(entry.key, frameSize);
        else if (entry.kind === "supply") {
          const supplyItem = entry.entity || catalogItemById(entry.key);
          sprite = supplyItem ? getCatalogPreview(supplyItem, frameSize) : getTreasureSprite(frameSize);
        }
        else {
          const previewAppearance = {
            skin: "浅砂",
            hairColor: "麦金",
            hairStyle: entry.kind === "hair" ? entry.key : "短发",
            eyeColor: "曜石黑",
            eyeStyle: "圆眼",
            mouthStyle: "平口-深棕",
            topColor: "草地绿",
            bottomColor: "深夜蓝",
            background: "草地小径",
            topStyle: entry.kind === "top" ? entry.key : "新手上衣",
            bottomStyle: entry.kind === "bottom" ? entry.key : "新手下装",
            weapon: entry.kind === "gear" ? entry.key : "无",
            accessory: "无",
          };
          sprite = getCharacterSprite(previewAppearance, frameSize);
        }
      } else if (entry.entity) {
        frameColor = itemRarityFrameColor(entry.entity);
        sprite = getCatalogPreview(entry.entity, frameSize);
      } else if (entry.kind === "pet") {
        const species = entry.species;
        const petSpriteDemo = { species: species, stage: entry.stage, isEgg: false, displayForm: entry.stage };
        frameColor = petRarityFrameColor({ species: species });
        sprite = getPetSpriteSafe(petSpriteDemo, frameSize, entry.stage);
      } else if (entry.kind === "boss") {
        frameColor = bossRarityFrameColor(entry.boss);
        sprite = getBossSpriteSafe(entry.boss.kind, frameSize);
      } else if (entry.kind === "companion") {
        frameColor = itemRarityFrameColor({ rarity: entry.companion && entry.companion.spriteType === "monster" ? "普通" : "精良" });
        sprite = getCompanionCodexSprite(entry.companion, frameSize);
      }
      if (!unlocked) {
        // 未解锁：灰色问号
        sprite = getTreasureSprite(frameSize);
        title = entry.name;
      }
      // 即使未解锁也按等级显示外边框颜色
      drawSpriteFrame(targetCtx, sprite, frameX, frameY, frameSize, frameColor);
      // 完整图鉴列表：小标题相对于小图片向右偏移约 20 像素
      const titleWidth = frameSize + 8;
      const titleX = frameX + 20;
      const titleY = frameY + frameSize + 10;
      drawTextFitted(targetCtx, title, titleX, titleY, titleWidth, 16, unlocked ? THEME.inkSoft : "#a08f87", "600", "center", 12);
      // 无论是否解锁，都打开右侧详情，由右侧决定显示“未解锁”占位信息
      registerClippedRegion(overlayRegions, cx, cy, cardW, cardH, leftX, leftY, leftWInner, leftHInner, function () {
        if (state.modal && state.modal.type === "codex") {
          state.modal.selectedId = id;
          renderApp();
        } else {
          setModal({ type: "codex", category: activeCategory, selectedId: id, scroll: scroll, unlockedOnly: showUnlockedOnly });
        }
      });
    });
    const contentRows = Math.ceil(filtered.length / perRow);
    const contentHeight = pad + contentRows * (cardH + pad);
    const maxScroll = Math.max(0, contentHeight - leftHInner);
    modal.maxScroll = maxScroll;
    modal.scroll = clamp(scroll, 0, maxScroll);
    targetCtx.restore();

    if (maxScroll > 0) {
      fillRect(targetCtx, leftX + leftWInner - 10, leftY, 6, leftHInner, "#5c342d");
      const thumbH = Math.max(40, leftHInner * (leftHInner / (leftHInner + maxScroll)));
      const thumbY = leftY + ((leftHInner - thumbH) * (modal.scroll / maxScroll));
      fillRect(targetCtx, leftX + leftWInner - 12, thumbY, 10, thumbH, THEME.yellow);
      targetCtx.strokeStyle = THEME.black;
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(leftX + leftWInner - 12, thumbY, 10, thumbH);
    }

    // 详情区
    drawCard(targetCtx, rightX, rightY, rightW, rightH, THEME.paper);
    const selectedId = modal.selectedId;
    if (!selectedId) {
      drawParagraph(targetCtx, narrowLayout ? "在上方选择一个条目，可以查看它的详细图鉴信息。" : "在左侧选择一个条目，可以查看它的详细图鉴信息。", rightX + 24, rightY + 32, rightW - 48, 18, THEME.inkSoft, 24, { maxLines: narrowLayout ? 5 : 4 });
    } else {
      const parsed = (function () {
        const idx = selectedId.indexOf(":");
        if (idx < 0) return { kind: "unknown", key: selectedId };
        return { kind: selectedId.slice(0, idx), key: selectedId.slice(idx + 1) };
      })();
      let title = "";
      let sprite = null;
      let kindLabel = "";
      let levelText = "";
      let desc = "";
      let sourceText = "";
      let unlockedAt = "";
      const codexEntry = activeCodex().items[selectedId];
      const isUnlocked = Boolean(codexEntry && codexEntry.unlocked);
      const isInitialEntry = Boolean(codexEntry && codexEntry.origin === "initial");
      if (isUnlocked && codexEntry && !isInitialEntry) {
        if (codexEntry.unlockedAtMs != null) {
          const d = new Date(codexEntry.unlockedAtMs);
          unlockedAt = (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") + ":" + String(d.getSeconds()).padStart(2, "0");
        } else if (codexEntry.unlockedAt) unlockedAt = codexEntry.unlockedAt;
      }
      // 初始条目优先：使用图鉴里记录的描述/稀有度，并给出“初始获得”的来源与时间
      if (isInitialEntry && codexEntry) {
        title = codexEntry.name || title;
        kindLabel = parsed.kind === "scene" ? "背景" : parsed.kind === "hair" ? "发型" : parsed.kind === "top" ? "上装" : parsed.kind === "bottom" ? "下装" : parsed.kind === "gear" ? "装备" : parsed.kind === "supply" ? "补给" : "物品";
        levelText = codexEntry.rarity || "廉价";
        desc = codexEntry.description || "";
        sourceText = "初始获得";
        unlockedAt = "初始获得";
        if (parsed.kind === "scene") sprite = getSceneSprite(parsed.key, 120);
        else if (parsed.kind === "supply") {
          const supplyItem = catalogItemById(parsed.key);
          if (supplyItem) sprite = getCatalogPreview(supplyItem, 120);
        }
        else {
          const previewAppearance = {
            skin: "浅砂",
            hairColor: "麦金",
            hairStyle: parsed.kind === "hair" ? parsed.key : "短发",
            eyeColor: "曜石黑",
            eyeStyle: "圆眼",
            mouthStyle: "平口-深棕",
            topColor: "草地绿",
            bottomColor: "深夜蓝",
            background: "草地小径",
            topStyle: parsed.kind === "top" ? parsed.key : "新手上衣",
            bottomStyle: parsed.kind === "bottom" ? parsed.key : "新手下装",
            weapon: parsed.kind === "gear" ? parsed.key : "无",
            accessory: "无",
          };
          sprite = getCharacterSprite(previewAppearance, 120);
        }
      } else if (parsed.kind === "scene" || parsed.kind === "hair" || parsed.kind === "top" || parsed.kind === "bottom" || parsed.kind === "gear" || parsed.kind === "supply" || parsed.kind === "accessory" || (parsed.kind === "pet" && catalogItemById(parsed.key))) {
        const item = catalogItemById(parsed.key);
        if (item) {
          title = item.name;
          sprite = getCatalogPreview(item, 120);
          kindLabel = CATEGORY_LABELS[item.category] || "物品";
          levelText = itemRarityLabel(item);
          desc = item.description || "";
          const entryOrigin = (codexEntry && codexEntry.origin && codexEntry.origin !== "initial") ? codexEntry.origin : "";
          if (entryOrigin) {
            sourceText = entryOrigin;
          } else if (item.purchaseMode === "drop") {
            sourceText = "冒险掉落";
          } else if (item.purchaseMode === "bossDrop") {
            sourceText = "Boss 掉落";
          } else {
            sourceText = "像素商店";
          }
          // 特例：光头视为初始获得
          if (item.id === "hair-bald") sourceText = "初始获得";
        }
      } else if (parsed.kind === "pet") {
        const parts = parsed.key.split(":");
        const species = parts[0];
        const stageIndex = Number(parts[1] || "1");
        const base = PET_SPECIES[species];
        if (base) {
          const stageName = PET_STAGES[stageIndex] || "阶段";
          title = base.name + "·" + stageName;
          const petDemo = { species: species, stage: stageIndex, isEgg: false, displayForm: stageIndex };
          sprite = getPetSpriteSafe(petDemo, 120, stageIndex);
          kindLabel = "宠物";
          levelText = petRarityLabel({ species: species, rarity: null });
          desc = String(base.intro || "").trim();
          // 宠物来源与对应宠物蛋一致
          const eggItem = catalogPetEggBySpecies(species);
          if (eggItem) {
            if (eggItem.purchaseMode === "drop") sourceText = "冒险掉落";
            else if (eggItem.purchaseMode === "bossDrop") sourceText = "Boss 掉落";
            else sourceText = "像素商店";
          } else {
            sourceText = "宠物中心 / 探索与奖励";
          }
        }
      } else if (parsed.kind === "boss") {
        const boss = BOSS_ROTATION.find(function (b) { return b.id === parsed.key; });
        if (boss) {
          title = boss.name;
          sprite = getBossSpriteSafe(boss.kind, 120);
          kindLabel = "Boss";
          levelText = "Lv." + String(boss.level || 1);
          desc = boss.description || "";
          sourceText = "主线 Boss 解锁";
        }
      } else if (parsed.kind === "companion") {
        const companion = companionById(parsed.key);
        if (companion) {
          const companionRecord = activeCompanionRecord(companion.id);
          title = companion.name;
          sprite = getCompanionCodexSprite(companion, 120);
          kindLabel = "伙伴";
          levelText = companion.spriteType === "monster" ? "奇遇" : "同行";
          desc = companion.intro || "";
          sourceText = (codexEntry && codexEntry.origin) || ((companionRecord && companionRecord.firstMetLocationName) ? (companionRecord.firstMetLocationName + "解锁") : "???解锁");
        }
      }
      // 图鉴详情排版：大图逻辑
      const rawDescText = (desc && String(desc).trim()) || "暂无简介。";
      const descText = isInitialEntry ? rawDescText : (parsed.kind === "pet" ? rawDescText : (isUnlocked ? rawDescText : "未知"));
      const detailImageSize = narrowLayout
        ? Math.max(120, Math.min(148, Math.floor(Math.min(rightH - 36, rightW * 0.42))))
        : 280;
      const detailSprite = isUnlocked && sprite ? sprite : getTreasureSprite(detailImageSize);
      if (narrowLayout) {
        const detailPad = 18;
        const detailImageX = rightX + detailPad;
        const detailImageY = rightY + 18;
        const infoX = detailImageX + detailImageSize + 20;
        const infoW = Math.max(120, rightX + rightW - 18 - infoX);
        drawSpriteFrame(targetCtx, detailSprite, detailImageX, detailImageY, detailImageSize, null);
        drawTextFitted(targetCtx, title || "未知条目", infoX, detailImageY + 8, infoW, 26, THEME.ink, "700", "left", 20);
        const descY = detailImageY + 44;
        const descHeight = drawParagraph(targetCtx, "“" + descText + "”", infoX, descY, infoW, 17, THEME.inkSoft, 22, { maxLines: 2 });
        let lineY = descY + descHeight + 10;
        function drawMetaRow(label, value) {
          const blockText = label + ": " + (value || "-");
          const blockHeight = drawParagraph(targetCtx, blockText, infoX, lineY, infoW, 15, THEME.inkSoft, 18, { maxLines: 2, weight: "600" });
          lineY += Math.max(18, blockHeight) + 4;
        }
        drawMetaRow("类型", kindLabel || "未知");
        drawMetaRow("等级", parsed.kind === "boss" ? (levelText || "—") : (levelText || "普通"));
        if (isInitialEntry) {
          drawMetaRow("来源", "初始获得");
          drawMetaRow("解锁时间", "初始获得");
        } else {
          drawMetaRow("来源", isUnlocked ? (sourceText || "未知来源") : "未解锁");
          drawMetaRow("解锁时间", isUnlocked && unlockedAt ? unlockedAt : "未解锁");
        }
      } else {
        const detailImageX = rightX + (rightW - detailImageSize) / 2;
        const detailImageY = rightY + 28;
        drawSpriteFrame(targetCtx, detailSprite, detailImageX, detailImageY, detailImageSize, null);
        const nameY = detailImageY + detailImageSize + 24;
        const nameX = rightX + 32 + 173;
        const nameWidth = rightW - 64 - 173;
        drawTextFitted(targetCtx, title || "未知条目", nameX, nameY, nameWidth, 26, THEME.ink, "700", "center", 20);
        const descX = rightX + 32;
        const descY = nameY + 44;
        const descWidth = rightW - 64;
        const descLines = wrapLines(targetCtx, "“" + descText + "”", descWidth, 16, "500");
        const descCenterX = descX + descWidth / 2;
        let descHeight = 0;
        descLines.slice(0, 4).forEach(function (line, index) {
          const lineY = descY + index * 24;
          drawText(targetCtx, line, descCenterX, lineY, 16, THEME.inkSoft, "500", "center");
          descHeight = (index + 1) * 24;
        });
        let lineY = descY + descHeight + 26;
        function drawMetaRow(label, value) {
          drawText(targetCtx, label + "：", rightX + 32, lineY, 16, THEME.inkSoft, "600");
          drawParagraph(targetCtx, value || "—", rightX + 112, lineY - 4, rightW - 144, 16, THEME.inkSoft, 22, { maxLines: 3 });
          lineY += 32;
        }
        drawMetaRow("类型", kindLabel || "未知");
        drawMetaRow("等级", parsed.kind === "boss" ? (levelText || "—") : (levelText || "普通"));
        if (isInitialEntry) {
          drawMetaRow("来源", "初始获得");
          drawMetaRow("解锁时间", "初始获得");
        } else {
          drawMetaRow("来源", isUnlocked ? (sourceText || "未知来源") : "未解锁");
          drawMetaRow("解锁时间", isUnlocked && unlockedAt ? unlockedAt : "未解锁");
        }
      }
    }
    targetCtx.restore();
  }

  function renderAchievementsModal(targetCtx, view) {
    const modal = state.modal || {};
    const phoneFullscreen = view.width <= 640;
    const width = phoneFullscreen ? Math.min(720, view.contentWidth - 8) : Math.min(1180, view.contentWidth - 60);
    const height = phoneFullscreen ? Math.max(420, view.logicalHeight - 12) : Math.min(750, view.logicalHeight - 80);
    const x = view.left + (view.contentWidth - width) / 2;
    const y = phoneFullscreen ? 6 : 40;
    const narrowLayout = width < 820;
    const leftRatio = 0.6;
    const gap = narrowLayout ? 16 : 24;
    const leftW = Math.floor(width * leftRatio);
    const headerH = 40;
    overlayModalLayout = { type: "achievements", x: x, y: y, width: width, height: height, header: { x: x, y: y, width: width, height: headerH } };
    targetCtx.save();
    fillRect(targetCtx, x, y, width, height, THEME.paper);
    const closeW = 74;
    const closeH = 62;
    const closeX = x + width - closeW - 14;
    const closeY = y - 4;
    drawButton(targetCtx, closeX, closeY, closeW, closeH, "关闭", "red", { small: true });
    registerRegion(overlayRegions, closeX, closeY, closeW, closeH, function () { setModal(null); });
    const achievementsState = activeAchievements();
    const activeCategory = modal.category || "all";
    const showUnclaimedOnly = Boolean(modal.unclaimedOnly);

    // 筛选：仅看未领奖奖励
    const filterW = 170;
    const filterH = 50;
    const filterX = narrowLayout ? (x + 24) : (closeX - filterW - 16);
    const filterY = narrowLayout ? (y + 4) : y;
    const filterLabel = showUnclaimedOnly ? "显示全部" : "仅看未领奖";
    drawButton(targetCtx, filterX, filterY, filterW, filterH, filterLabel, showUnclaimedOnly ? "yellow" : "paper", {
      small: true,
      active: showUnclaimedOnly,
      disabled: false,
    });
    registerRegion(overlayRegions, filterX, filterY, filterW, filterH, function () {
      setModal({ type: "achievements", category: activeCategory, selectedId: null, scroll: 0, unclaimedOnly: !showUnclaimedOnly });
    });

    let categoryBottomY;
    if (narrowLayout) {
      const chipCols = 3;
      const chipGapX = 12;
      const chipGapY = 12;
      const chipW = Math.floor((width - 48 - chipGapX * (chipCols - 1)) / chipCols);
      const chipH = 50;
      const catStartY = y + 66;
      ACHIEVEMENT_CATEGORIES.forEach(function (entry, index) {
        const row = Math.floor(index / chipCols);
        const col = index % chipCols;
        const chipX = x + 24 + col * (chipW + chipGapX);
        const chipY = catStartY + row * (chipH + chipGapY);
        const isActive = entry.id === activeCategory;
        drawButton(targetCtx, chipX, chipY, chipW, chipH, entry.label, isActive ? "green" : "paper", { small: true, fontSize: 20, minFontSize: 14, active: isActive, disabled: isActive });
        if (!isActive) {
          registerRegion(overlayRegions, chipX, chipY, chipW, chipH, function () {
            setModal({ type: "achievements", category: entry.id, selectedId: null, scroll: 0, unclaimedOnly: showUnclaimedOnly });
          });
        }
      });
      const chipRows = Math.ceil(ACHIEVEMENT_CATEGORIES.length / chipCols);
      categoryBottomY = catStartY + chipRows * chipH + Math.max(0, chipRows - 1) * chipGapY;
    } else {
      let catX = x + 26;
      const catY = y + headerH - 30;
      const chipH = 40;
      ACHIEVEMENT_CATEGORIES.forEach(function (entry) {
        const label = entry.label;
        const isActive = entry.id === activeCategory;
        const chipW = Math.max(70, measureStyledTextWidth(targetCtx, label, 20, "600", null) + 26);
        drawButton(targetCtx, catX, catY, chipW, chipH, label, isActive ? "green" : "paper", { small: true, fontSize: 20, active: isActive, disabled: isActive });
        if (!isActive) {
          registerRegion(overlayRegions, catX, catY, chipW, chipH, function () {
            setModal({ type: "achievements", category: entry.id, selectedId: null, scroll: 0, unclaimedOnly: showUnclaimedOnly });
          });
        }
        catX += chipW + 10;
      });
      categoryBottomY = y + headerH + 10;
    }

    const bodyY = categoryBottomY + 18;
    const bodyBottom = y + height - 18;
    const availableBodyH = Math.max(180, bodyBottom - bodyY);
    const leftX = x + 24;
    const leftY = bodyY;
    const leftWInner = narrowLayout ? (width - 48) : leftW;
    const mobileMinThumbH = narrowLayout ? Math.min(236, Math.max(188, availableBodyH - gap - 224)) : 0;
    const mobileDetailTargetH = narrowLayout
      ? clamp(Math.round(leftWInner * 0.75), 216, Math.max(216, availableBodyH - gap - mobileMinThumbH))
      : 0;
    const leftHInner = narrowLayout ? Math.max(mobileMinThumbH, availableBodyH - gap - mobileDetailTargetH) : availableBodyH;
    const rightX = narrowLayout ? leftX : (leftX + leftWInner + gap);
    const rightY = narrowLayout ? (leftY + leftHInner + gap) : bodyY;
    const rightW = narrowLayout ? leftWInner : (width - leftW - gap - 40);
    const rightH = narrowLayout ? (bodyBottom - rightY) : Math.max(150, bodyBottom - rightY);
    if (overlayModalLayout) overlayModalLayout.scrollArea = { x: leftX, y: leftY, width: leftWInner, height: leftHInner };
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(leftX, leftY, leftWInner, leftHInner);
    targetCtx.clip();

    const all = ACHIEVEMENTS
      .filter(function (a) {
        if (activeCategory === "all") return true;
        return a.category === activeCategory;
      })
      .filter(function (a) {
        if (!showUnclaimedOnly) return true;
        const info = achievementsState.unlocked && achievementsState.unlocked[a.id];
        return info && !info.claimed;
      })
      .sort(function (a, b) {
      const ua = achievementsState.unlocked && achievementsState.unlocked[a.id] ? 1 : 0;
      const ub = achievementsState.unlocked && achievementsState.unlocked[b.id] ? 1 : 0;
      if (ua !== ub) return ub - ua;
      return a.name.localeCompare(b.name, "zh-Hans-CN");
    });

    const cardW = 148;
    const cardH = 132;
    const pad = 12;
    const perRow = Math.max(1, Math.floor((leftWInner - pad * 2) / (cardW + pad)));
    const scroll = clamp(Number(modal.scroll) || 0, 0, Number(modal.maxScroll) || 0);
    let offsetY = leftY + pad - scroll;

    all.forEach(function (ach, index) {
      const row = Math.floor(index / perRow);
      const col = index % perRow;
      const cx = leftX + pad + col * (cardW + pad);
      const cy = offsetY + row * (cardH + pad);
      const unlocked = Boolean(achievementsState.unlocked && achievementsState.unlocked[ach.id]);
      drawCard(targetCtx, cx, cy, cardW, cardH, THEME.paper);
      const frameSize = 76;
      const frameX = cx + (cardW - frameSize) / 2;
      const frameY = cy + 10;
      drawAchievementIcon(targetCtx, frameX, frameY, frameSize, ach, unlocked, false);
      const titleWidth = frameSize + 8;
      const titleX = frameX + 20;
      const titleY = frameY + frameSize + 10;
      drawTextFitted(targetCtx, ach.name, titleX, titleY, titleWidth, 16, unlocked ? THEME.inkSoft : "#a08f87", "600", "center", 12);
      registerClippedRegion(overlayRegions, cx, cy, cardW, cardH, leftX, leftY, leftWInner, leftHInner, function () {
        if (state.modal && state.modal.type === "achievements") {
          state.modal.selectedId = ach.id;
          renderApp();
        } else {
          setModal({ type: "achievements", category: activeCategory, selectedId: ach.id, scroll: scroll, unclaimedOnly: showUnclaimedOnly });
        }
      });
    });
    const contentRows = Math.ceil(all.length / perRow);
    const contentHeight = pad + contentRows * (cardH + pad);
    const maxScroll = Math.max(0, contentHeight - leftHInner);
    modal.maxScroll = maxScroll;
    modal.scroll = clamp(scroll, 0, maxScroll);
    targetCtx.restore();

    if (maxScroll > 0) {
      fillRect(targetCtx, leftX + leftWInner - 10, leftY, 6, leftHInner, "#5c342d");
      const thumbH = Math.max(40, leftHInner * (leftHInner / (leftHInner + maxScroll)));
      const thumbY = leftY + ((leftHInner - thumbH) * (modal.scroll / maxScroll));
      fillRect(targetCtx, leftX + leftWInner - 12, thumbY, 10, thumbH, THEME.yellow);
      targetCtx.strokeStyle = THEME.black;
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(leftX + leftWInner - 12, thumbY, 10, thumbH);
    }

    // 详情区
    drawCard(targetCtx, rightX, rightY, rightW, rightH, THEME.paper);
    const selectedId = modal.selectedId || (all[0] && all[0].id);
    const ach = selectedId ? achievementById(selectedId) : null;
    const unlockedInfo = ach && achievementsState.unlocked && achievementsState.unlocked[ach.id];
    const unlocked = Boolean(unlockedInfo);
    if (!ach) {
      drawParagraph(targetCtx, "这里暂时还没有可显示的成就。", rightX + 24, rightY + 32, rightW - 48, 18, THEME.inkSoft, 24, { maxLines: 4 });
    } else {
      const topPad = narrowLayout ? 18 : 34;
      const frameSize = narrowLayout
        ? Math.max(118, Math.min(148, Math.floor(Math.min(rightH - 36, rightW * 0.46))))
        : 120;
      const frameX = rightX + topPad;
      const frameY = rightY + (narrowLayout ? 18 : 32);
      drawAchievementIcon(targetCtx, frameX, frameY, frameSize, ach, unlocked, true);
      const titleX = frameX + frameSize + (narrowLayout ? 18 : 24);
      const titleW = rightW - (titleX - rightX) - topPad;
      drawTextFitted(targetCtx, ach.name, titleX, frameY + 8, titleW, narrowLayout ? 28 : 26, THEME.ink, "700", "left", 18);
      const descY = frameY + 42;
      const descHeight = drawParagraph(targetCtx, ach.description, titleX, descY, titleW, narrowLayout ? 17 : 16, THEME.inkSoft, 22, { maxLines: narrowLayout ? 2 : 3 });
      const timeText = unlockedInfo && unlockedInfo.unlockedAt
        ? dayKey(new Date(unlockedInfo.unlockedAt))
        : "未解锁";

      if (narrowLayout) {
        let infoY = descY + descHeight + 10;
        function drawInfoBlock(label, value, maxLines) {
          drawText(targetCtx, label, titleX, infoY, 15, THEME.inkSoft, "600");
          const blockH = drawParagraph(targetCtx, value || "—", titleX, infoY + 16, titleW, 15, THEME.ink, 18, { maxLines: maxLines || 2 });
          infoY += blockH + 22;
        }
        drawInfoBlock("达成条件", ach.condition, 2);
        drawInfoBlock("奖励", ach.rewardText || "—", 2);
        drawInfoBlock("达成时间", timeText, 1);
        const btnH = 50;
        const btnY = Math.min(infoY + 2, rightY + rightH - btnH - 14);
        const btnX = titleX;
        const btnW = Math.min(160, titleW);
        if (!unlocked) {
          drawButton(targetCtx, btnX, btnY, btnW, btnH, "未解锁", "disabled", { small: true, disabled: true });
        } else {
          const claimed = Boolean(unlockedInfo && unlockedInfo.claimed);
          const label = claimed ? "奖励已领取" : "领取奖励";
          const variant = claimed ? "disabled" : "yellow";
          drawButton(targetCtx, btnX, btnY, btnW, btnH, label, variant, {
            small: true,
            active: !claimed,
            disabled: claimed,
          });
          if (!claimed) {
            registerRegion(overlayRegions, btnX, btnY, btnW, btnH, function () {
              claimAchievementReward(ach.id);
            });
          }
        }
      } else {
        const infoY = Math.max(frameY + frameSize + 34, descY + descHeight + 18);
        drawText(targetCtx, "达成条件", rightX + topPad, infoY, 16, THEME.inkSoft, "600");
        drawParagraph(targetCtx, ach.condition, rightX + topPad, infoY + 18, rightW - topPad * 2, 16, THEME.ink, 24, { maxLines: 3 });
        const rewardY = infoY + 72;
        drawText(targetCtx, "奖励", rightX + topPad, rewardY, 16, THEME.inkSoft, "600");
        drawParagraph(targetCtx, ach.rewardText || "—", rightX + topPad, rewardY + 18, rightW - topPad * 2, 16, THEME.ink, 24, { maxLines: 2 });
        const timeY = rewardY + 66;
        drawText(targetCtx, "达成时间", rightX + topPad, timeY, 16, THEME.inkSoft, "600");
        drawText(targetCtx, timeText, rightX + topPad, timeY + 22, 16, unlocked ? THEME.ink : THEME.inkSoft, "500");
        const btnY = timeY + 80;
        const btnX = rightX + topPad;
        const btnW = 160;
        const btnH = 50;
        if (!unlocked) {
          drawButton(targetCtx, btnX, btnY, btnW, btnH, "未解锁", "disabled", { small: true, disabled: true });
        } else {
          const claimed = Boolean(unlockedInfo && unlockedInfo.claimed);
          const label = claimed ? "奖励已领取" : "领取奖励";
          const variant = claimed ? "disabled" : "yellow";
          drawButton(targetCtx, btnX, btnY, btnW, btnH, label, variant, {
            small: true,
            active: !claimed,
            disabled: claimed,
          });
          if (!claimed) {
            registerRegion(overlayRegions, btnX, btnY, btnW, btnH, function () {
              claimAchievementReward(ach.id);
            });
          }
        }
      }
    }
    targetCtx.restore();
  }

  function formatRelativeTimeFromNow(timestamp, emptyLabel) {
    const numeric = Number(timestamp);
    if (!Number.isFinite(numeric) || numeric <= 0) return emptyLabel || "暂无记录";
    const diffMs = Math.max(0, Date.now() - numeric);
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return "刚刚";
    if (hours < 1) return mins + "分钟前";
    if (days < 1) return hours + "小时前";
    return days + "天前";
  }

  /** 设置页「上一次导出」相对时间：24 小时内用小时/分钟，否则用天 */
  function formatLastExportRelativeLabel(lastExportAt) {
    return formatRelativeTimeFromNow(lastExportAt, "尚未导出");
  }

  function renderSettingsModal(targetCtx, view) {
    const width = Math.min(1140, view.contentWidth - 60);
    const modal = state.modal || {};
    const activeTab = modal.tab || "theme";
    const themes = settingsThemePresets();
    const themeSingleColumn = activeTab === "theme" && width < 760;
    const cols = themeSingleColumn ? 1 : (width > 940 ? 3 : 2);
    const gap = 18;
    const cardW = (width - 48 - gap * (cols - 1)) / cols;
    const themePerPage = themeSingleColumn ? 2 : themes.length;
    modal.themePerPage = themePerPage;
    const themeMaxPage = Math.max(0, Math.ceil(themes.length / themePerPage) - 1);
    const themePage = clamp(Number(modal.themePage) || 0, 0, themeMaxPage);
    const visibleThemes = themeSingleColumn ? themes.slice(themePage * themePerPage, themePage * themePerPage + themePerPage) : themes;
    const cardH = themeSingleColumn ? 228 : (cols === 3 ? 162 : 144);
    const rows = Math.ceil(visibleThemes.length / cols);
    const baseHeight = activeTab === "theme"
      ? 190 + rows * cardH + Math.max(0, rows - 1) * gap + (themeSingleColumn && themeMaxPage > 0 ? 76 : 0)
      : 190 + 148 + 130 + 130 + 2 * 18;
    const height = Math.min(view.logicalHeight - 60, Math.max(430, baseHeight));
    const x = (view.logicalWidth - width) / 2;
    const y = Math.max(32, (view.logicalHeight - height) / 2);
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "\u7cfb\u7edf\u8bbe\u7f6e", x + 28, y + 26, 18, "#d8aa95", "500");
    const tabY = y + 54;
    const tabW = 134;
    const tabH = 40;
    const tabX1 = x + 26;
    const tabX2 = tabX1 + tabW + 12;
    const tabX3 = tabX2 + tabW + 12;
    drawButton(targetCtx, tabX1, tabY, tabW, tabH, "\u754c\u9762\u989c\u8272", activeTab === "theme" ? "yellow" : "paper", { small: true, active: activeTab === "theme", disabled: activeTab === "theme" });
    drawButton(targetCtx, tabX2, tabY, tabW, tabH, "\u5b58\u6863\u8bbe\u7f6e", activeTab === "storage" ? "yellow" : "paper", { small: true, active: activeTab === "storage", disabled: activeTab === "storage" });
    drawButton(targetCtx, tabX3, tabY, tabW, tabH, "\u6a21\u5f0f\u8bbe\u7f6e", activeTab === "mode" ? "yellow" : "paper", { small: true, active: activeTab === "mode", disabled: activeTab === "mode" });
    if (activeTab !== "theme") {
      registerRegion(overlayRegions, tabX1, tabY, tabW, tabH, function () { setModal({ type: "settings", tab: "theme" }); });
    }
    if (activeTab !== "storage") {
      registerRegion(overlayRegions, tabX2, tabY, tabW, tabH, function () { setModal({ type: "settings", tab: "storage" }); });
    }
    if (activeTab !== "mode") {
      registerRegion(overlayRegions, tabX3, tabY, tabW, tabH, function () { setModal({ type: "settings", tab: "mode" }); });
    }
    if (activeTab === "theme") {
      drawTextFitted(targetCtx, "选择一款颜色，自定义你的冒险界面", x + 30, y + 112, width - 160, 18, "#f2dac8", "500", "left", 12);
    }
    drawButton(targetCtx, x + width - 108, y + 24, 74, 62, "\u5173\u95ed", "red", { small: true });
    registerRegion(overlayRegions, x + width - 108, y + 24, 74, 62, function () { setModal(null); });
    if (activeTab === "theme") {
      visibleThemes.forEach(function (theme, index) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const cardX = x + 24 + col * (cardW + gap);
        const cardY = y + 148 + row * (cardH + gap);
        const active = state.uiTheme === theme.id;
        drawCard(targetCtx, cardX, cardY, cardW, cardH, THEME.paperSoft);
        fillRect(targetCtx, cardX + 18, cardY + 20, 112, 86, theme.frameLight);
        fillRect(targetCtx, cardX + 24, cardY + 26, 100, 74, theme.frame);
        fillRect(targetCtx, cardX + 30, cardY + 32, 88, 30, theme.sky);
        fillRect(targetCtx, cardX + 30, cardY + 62, 88, 16, theme.ground);
        fillRect(targetCtx, cardX + 30, cardY + 78, 88, 16, theme.paper);
        fillRect(targetCtx, cardX + 40, cardY + 40, 24, 8, theme.cloudA);
        fillRect(targetCtx, cardX + 74, cardY + 44, 18, 6, theme.cloudB);
        if (themeSingleColumn) {
          drawTextFitted(targetCtx, theme.name, cardX + 146, cardY + 24, cardW - 166, 24, THEME.ink, "700", "left", 16);
          drawParagraph(targetCtx, theme.description, cardX + 18, cardY + 118, cardW - 36, 15, THEME.inkSoft, 18, { maxLines: 3 });
          drawButton(targetCtx, cardX + 18, cardY + cardH - 52, cardW - 36, 40, active ? "\u4f7f\u7528\u4e2d" : "\u5207\u6362", active ? "yellow" : "paper", {
            small: true,
            active: active,
            disabled: active,
            fontSize: 16,
            minFontSize: 11
          });
          if (!active) registerRegion(overlayRegions, cardX + 18, cardY + cardH - 52, cardW - 36, 40, function () { setUiTheme(theme.id); });
        } else {
          drawTextFitted(targetCtx, theme.name, cardX + 146, cardY + 22, cardW - 166, 24, THEME.ink, "700", "left", 16);
          drawTextFitted(targetCtx, theme.description, cardX + 146, cardY + 58, cardW - 166, 17, THEME.inkSoft, "500", "left", 12);
          drawButton(targetCtx, cardX + cardW - 134, cardY + cardH - 58, 108, 42, active ? "\u4f7f\u7528\u4e2d" : "\u5207\u6362", active ? "yellow" : "paper", { small: true, active: active, disabled: active });
          if (!active) registerRegion(overlayRegions, cardX + cardW - 134, cardY + cardH - 58, 108, 42, function () { setUiTheme(theme.id); });
        }
      });
      if (themeSingleColumn && themeMaxPage > 0) {
        const pagerY = y + height - 84;
        drawText(targetCtx, "第 " + (themePage + 1) + " 页 / 共 " + (themeMaxPage + 1) + " 页", x + width / 2, pagerY + 6, 16, "#d8aa95", "600", "center");
        drawButton(targetCtx, x + width / 2 - 132, pagerY + 22, 88, 40, "上一页", themePage > 0 ? "pager" : "pagerDisabled", { small: true });
        drawButton(targetCtx, x + width / 2 + 44, pagerY + 22, 88, 40, "下一页", themePage < themeMaxPage ? "pager" : "pagerDisabled", { small: true });
        if (themePage > 0) registerRegion(overlayRegions, x + width / 2 - 132, pagerY + 22, 88, 40, function () { shiftSettingsThemePage(-1); });
        if (themePage < themeMaxPage) registerRegion(overlayRegions, x + width / 2 + 44, pagerY + 22, 88, 40, function () { shiftSettingsThemePage(1); });
      }
    } else if (activeTab === "storage") {
      const cardX = x + 24;
      const cardY = y + 148;
      const cardWStorage = width - 48;
      const cardHExport = 148;
      const cardHStorage = 130;
      const btnW = 120;
      const btnH = 52;
      let btnX;
      let btnY;

      drawCard(targetCtx, cardX, cardY, cardWStorage, cardHExport, THEME.paperSoft);
      drawTextFitted(targetCtx, "导出存档", cardX + 24, cardY + 40, 200, 24, THEME.ink, "700", "left", 16);
      drawTextFitted(
        targetCtx,
        "上一次导出存档：" + formatLastExportRelativeLabel(state.lastExportAt),
        cardX + 24,
        cardY + 84,
        cardWStorage - 220,
        16,
        THEME.inkSoft,
        "500",
        "left",
        12
      );
      btnX = cardX + cardWStorage - btnW - 26;
      btnY = cardY + cardHExport / 2 - btnH / 2;
      drawButton(targetCtx, btnX, btnY, btnW, btnH, "导出存档", "yellow");
      registerRegion(overlayRegions, btnX, btnY, btnW, btnH, function () { setModal({ type: "exportConfirm" }); });

      const importCardY = cardY + cardHExport + 18;
      drawCard(targetCtx, cardX, importCardY, cardWStorage, cardHStorage, THEME.paperSoft);
      drawTextFitted(targetCtx, "导入存档", cardX + 24, importCardY + 42, 200, 24, THEME.ink, "700", "left", 16);
      btnX = cardX + cardWStorage - btnW - 26;
      btnY = importCardY + cardHStorage / 2 - btnH / 2;
      drawButton(targetCtx, btnX, btnY, btnW, btnH, "导入存档", "paper");
      registerRegion(overlayRegions, btnX, btnY, btnW, btnH, function () { setModal({ type: "importConfirm" }); });

      const resetCardY = importCardY + cardHStorage + 18;
      drawCard(targetCtx, cardX, resetCardY, cardWStorage, cardHStorage, THEME.paperSoft);
      drawTextFitted(targetCtx, "数据初始化", cardX + 24, resetCardY + 42, 200, 24, THEME.ink, "700", "left", 16);
      btnX = cardX + cardWStorage - btnW - 26;
      btnY = resetCardY + cardHStorage / 2 - btnH / 2;
      drawButton(targetCtx, btnX, btnY, btnW, btnH, "数据初始化", "red");
      registerRegion(overlayRegions, btnX, btnY, btnW, btnH, function () { setModal({ type: "resetConfirm" }); });
    } else if (false && activeTab === "storage") {
      const cardX = x + 24;
      const cardY = y + 148;
      const cardWStorage = width - 48;
      const cardHExport = 148;
      const cardHStorage = 130;
      // 导出存档
      drawCard(targetCtx, cardX, cardY, cardWStorage, cardHExport, THEME.paperSoft);
      drawTextFitted(targetCtx, "导出存档", cardX + 24, cardY + 24, 200, 24, THEME.ink, "700", "left", 16);
      drawTextFitted(targetCtx, "将当前进度保存为一个 JSON 文件，下载到本地用于备份或迁移。", cardX + 24, cardY + 60, cardWStorage - 220, 18, THEME.inkSoft, "500", "left", 12);
      drawTextFitted(
        targetCtx,
        "上一次导出存档：" + formatLastExportRelativeLabel(state.lastExportAt),
        cardX + 24,
        cardY + 90,
        cardWStorage - 220,
        16,
        THEME.inkSoft,
        "500",
        "left",
        12
      );
      const btnW = 120;
      const btnH = 52;
      let btnX = cardX + cardWStorage - btnW - 26;
      let btnY = cardY + cardHExport / 2 - btnH / 2;
      drawButton(targetCtx, btnX, btnY, btnW, btnH, "导出存档", "yellow");
      registerRegion(overlayRegions, btnX, btnY, btnW, btnH, function () { setModal({ type: "exportConfirm" }); });

      // 导入存档
      const importCardY = cardY + cardHExport + 18;
      drawCard(targetCtx, cardX, importCardY, cardWStorage, cardHStorage, THEME.paperSoft);
      drawTextFitted(targetCtx, "导入存档", cardX + 24, importCardY + 24, 200, 24, THEME.ink, "700", "left", 16);
      drawTextFitted(targetCtx, "从本地 JSON 文件恢复存档，将覆盖当前进度。建议先导出备份。", cardX + 24, importCardY + 60, cardWStorage - 220, 18, THEME.inkSoft, "500", "left", 12);
      btnX = cardX + cardWStorage - btnW - 26;
      btnY = importCardY + cardHStorage / 2 - btnH / 2;
      drawButton(targetCtx, btnX, btnY, btnW, btnH, "导入存档", "paper");
      registerRegion(overlayRegions, btnX, btnY, btnW, btnH, function () { setModal({ type: "importConfirm" }); });

      // 数据初始化
      const resetCardY = importCardY + cardHStorage + 18;
      drawCard(targetCtx, cardX, resetCardY, cardWStorage, cardHStorage, THEME.paperSoft);
      drawTextFitted(targetCtx, "数据初始化", cardX + 24, resetCardY + 24, 200, 24, THEME.ink, "700", "left", 16);
      drawTextFitted(targetCtx, "恢复为初始存档，会清空当前进度。此操作不可撤销，务必先导出备份。", cardX + 24, resetCardY + 60, cardWStorage - 220, 18, THEME.inkSoft, "500", "left", 12);
      btnX = cardX + cardWStorage - btnW - 26;
      btnY = resetCardY + cardHStorage / 2 - btnH / 2;
      drawButton(targetCtx, btnX, btnY, btnW, btnH, "数据初始化", "red");
      registerRegion(overlayRegions, btnX, btnY, btnW, btnH, function () { setModal({ type: "resetConfirm" }); });
    } else if (activeTab === "mode") {
      const cardX = x + 24;
      const cardY = y + 168;
      const cardWMode = width - 48;
      const cardHMode = 180;
      // 挑战模式 / 游戏模式
      drawCard(targetCtx, cardX, cardY, cardWMode, cardHMode, THEME.paperSoft);
      drawTextFitted(targetCtx, "专注模式", cardX + 24, cardY + 24, 200, 24, THEME.ink, "700", "left", 16);
      drawTextFitted(targetCtx, "选择下面的模式控制任务完成频率：挑战模式会限制刷分，游戏模式更自由。", cardX + 24, cardY + 60, cardWMode - 48, 18, THEME.inkSoft, "500", "left", 12);
      const btnW = 180;
      const btnH = 60;
      const gapBtn = 26;
      const totalBtnW = btnW * 2 + gapBtn;
      const startX = cardX + (cardWMode - totalBtnW) / 2;
      const btnY = cardY + 100;
      const inChallenge = state.challengeMode;
      drawButton(targetCtx, startX, btnY, btnW, btnH, "游戏模式", inChallenge ? "paper" : "yellow", { small: true, fontSize: 20, active: !inChallenge, disabled: !inChallenge });
      drawButton(targetCtx, startX + btnW + gapBtn, btnY, btnW, btnH, "挑战模式", inChallenge ? "yellow" : "paper", { small: true, fontSize: 20, active: inChallenge, disabled: inChallenge });
      if (inChallenge) {
        registerRegion(overlayRegions, startX, btnY, btnW, btnH, function () {
          setModal({ type: "modeConfirm", targetMode: "game" });
          renderApp();
        });
      } else {
        registerRegion(overlayRegions, startX + btnW + gapBtn, btnY, btnW, btnH, function () {
          setModal({ type: "modeConfirm", targetMode: "challenge" });
          renderApp();
        });
      }
      // 纯净模式 / 普通模式
      const cardY2 = cardY + cardHMode + 18;
      drawCard(targetCtx, cardX, cardY2, cardWMode, cardHMode, THEME.paperSoft);
      drawTextFitted(targetCtx, "纯净模式", cardX + 24, cardY2 + 24, 200, 24, THEME.ink, "700", "left", 16);
      drawTextFitted(targetCtx, "纯净模式下只保留任务区，其他页面会锁定，适合短时间高度专注。", cardX + 24, cardY2 + 60, cardWMode - 48, 18, THEME.inkSoft, "500", "left", 12);
      const btnY2 = cardY2 + 100;
      const inPure = state.pureMode;
      drawButton(targetCtx, startX, btnY2, btnW, btnH, "普通模式", inPure ? "paper" : "yellow", { small: true, fontSize: 20, active: !inPure, disabled: !inPure });
      drawButton(targetCtx, startX + btnW + gapBtn, btnY2, btnW, btnH, "纯净模式", inPure ? "yellow" : "paper", { small: true, fontSize: 20, active: inPure, disabled: inPure });
      if (inPure) {
        registerRegion(overlayRegions, startX, btnY2, btnW, btnH, function () {
          setModal({ type: "modeConfirm", targetMode: "pureOff" });
          renderApp();
        });
      } else {
        registerRegion(overlayRegions, startX + btnW + gapBtn, btnY2, btnW, btnH, function () {
          setModal({ type: "modeConfirm", targetMode: "pureOn" });
          renderApp();
        });
      }
    }
  }

  function scrollEditorChoiceRow(rowKey, delta, maxScroll) {
    if (!state.modal || state.modal.type !== "editor") return;
    if (!state.modal.choiceScrolls) state.modal.choiceScrolls = {};
    const current = state.modal.choiceScrolls[rowKey] || 0;
    const next = clamp(current + delta, 0, Math.max(0, maxScroll || 0));
    if (next === current) return;
    state.modal.choiceScrolls[rowKey] = next;
    renderApp();
  }

  function drawEditorChoiceRow(targetCtx, x, y, width, rowKey, title, buttons, clipRect) {
    drawText(targetCtx, title, x, y, 16, THEME.inkSoft, "500");
    const rowY = y + 24;
    const rowH = 56;
    const arrowW = 42;
    const gap = 12;
    const viewportX = x + arrowW + 10;
    const viewportW = width - arrowW * 2 - 20;
    const clipTop = clipRect ? clipRect.y : rowY;
    const clipHeight = clipRect ? clipRect.height : rowH;
    const clipBottom = clipTop + clipHeight;
    const totalWidth = buttons.reduce(function (sum, button, index) { return sum + button.width + (index < buttons.length - 1 ? gap : 0); }, 0);
    const maxScroll = Math.max(0, totalWidth - viewportW);
    if (!state.modal.choiceScrolls) state.modal.choiceScrolls = {};
    const scroll = clamp(state.modal.choiceScrolls[rowKey] || 0, 0, maxScroll);
    state.modal.choiceScrolls[rowKey] = scroll;
    const canLeft = scroll > 0;
    const canRight = scroll < maxScroll;
    drawButton(targetCtx, x, rowY, arrowW, rowH, "<", canLeft ? "paper" : "disabled", { small: true, disabled: !canLeft });
    drawButton(targetCtx, x + width - arrowW, rowY, arrowW, rowH, ">", canRight ? "paper" : "disabled", { small: true, disabled: !canRight });
    if (canLeft) registerClippedRegion(overlayRegions, x, rowY, arrowW, rowH, x, clipTop, arrowW, clipHeight, function () { scrollEditorChoiceRow(rowKey, -220, maxScroll); });
    if (canRight) registerClippedRegion(overlayRegions, x + width - arrowW, rowY, arrowW, rowH, x + width - arrowW, clipTop, arrowW, clipHeight, function () { scrollEditorChoiceRow(rowKey, 220, maxScroll); });
    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(viewportX, rowY, viewportW, rowH);
    targetCtx.clip();
    let cursorX = viewportX - scroll;
    buttons.forEach(function (button) {
      const visible = cursorX + button.width > viewportX && cursorX < viewportX + viewportW && rowY + rowH > clipTop && rowY < clipBottom;
      if (visible) {
        drawButton(targetCtx, cursorX, rowY, button.width, rowH, button.label, button.active ? "yellow" : "paper", { small: true, active: button.active });
        registerClippedRegion(overlayRegions, cursorX, rowY, button.width, rowH, viewportX, clipTop, viewportW, clipHeight, button.onClick);
      }
      cursorX += button.width + gap;
    });
    targetCtx.restore();
  }

  function scrollEditorModal(delta) {
    if (!state.modal || state.modal.type !== "editor") return;
    const nextScroll = clamp((state.modal.scroll || 0) + delta, 0, Math.max(0, state.modal.maxScroll || 0));
    if (nextScroll === (state.modal.scroll || 0)) return;
    state.modal.scroll = nextScroll;
    renderApp();
  }

  function renderEditorModal(targetCtx, view) {
    const compactEditor = view.width <= 560 || view.contentWidth < 760;
    const width = Math.min(compactEditor ? 760 : 1080, view.contentWidth - (compactEditor ? 12 : 40));
    const height = Math.min(compactEditor ? view.logicalHeight - 12 : view.logicalHeight - 40, compactEditor ? 960 : 900);
    const x = view.left + (view.contentWidth - width) / 2;
    const y = compactEditor ? 6 : 20;
    drawPanel(targetCtx, x, y, width, height, THEME.frame);
    drawText(targetCtx, "像素衣柜", x + 26, y + 24, 18, "#d8aa95", "500");
    drawPixelText(targetCtx, "自定义你的冒险者形象", x + 26, y + 54, { size: 26, color: "#fff3de", font: "sans-serif" });
    drawButton(targetCtx, x + width - 108, y + 24, 74, 62, "关闭", "red", { small: true });
    registerRegion(overlayRegions, x + width - 108, y + 24, 74, 62, function () { setModal(null); unlockAchievement("misc_customize_avatar"); });

    const innerX = x + 24;
    const innerY = y + 106;
    const innerW = width - 48;
    const innerH = height - 132;
    const previewCardX = innerX;
    const previewCardY = innerY;
    const previewCardW = innerW;
    const previewCardH = compactEditor ? 360 : 392;
    const bodyCardX = innerX;
    const bodyCardY = previewCardY + previewCardH + 18;
    const bodyCardW = innerW;
    const bodyCardH = Math.max(180, innerY + innerH - bodyCardY);
    const bodyViewportX = bodyCardX + 12;
    const bodyViewportY = bodyCardY + 12;
    const bodyViewportW = bodyCardW - 24;
    const bodyViewportH = bodyCardH - 24;
    const contentPad = 18;
    const scrollbarReserve = 18;
    const contentW = bodyViewportW - contentPad * 2 - scrollbarReserve;
    const selectorGapX = 12;
    const selectorFieldH = compactEditor ? 56 : 60;
    const selectorRowPitch = 104;
    const selectorCols = 4;
    const selectorW = Math.floor((contentW - selectorGapX * (selectorCols - 1)) / selectorCols);
    const collectionStartOffset = 228;
    const choiceRowPitch = 108;
    const contentHeight = 18 + collectionStartOffset + choiceRowPitch * 6 + 12;
    const maxScroll = Math.max(0, contentHeight - bodyViewportH);
    const scroll = clamp(Number(state.modal.scroll) || 0, 0, maxScroll);
    state.modal.scroll = scroll;
    state.modal.maxScroll = maxScroll;

    overlayModalLayout = {
      type: "editor",
      x: x,
      y: y,
      width: width,
      height: height,
      scrollArea: { x: bodyViewportX, y: bodyViewportY, width: bodyViewportW, height: bodyViewportH }
    };

    drawCard(targetCtx, previewCardX, previewCardY, previewCardW, previewCardH, THEME.paper);
    drawCard(targetCtx, bodyCardX, bodyCardY, bodyCardW, bodyCardH, THEME.paper);

    const previewSize = clamp(
      Math.round(Math.min(previewCardW * (compactEditor ? 0.34 : 0.28), previewCardH - 140)),
      compactEditor ? 180 : 210,
      compactEditor ? 220 : 250
    );
    const previewX = previewCardX + (previewCardW - previewSize) / 2;
    const previewY = previewCardY + 22;
    drawSpriteFrame(targetCtx, getCharacterSprite(state.profile.appearance, 96), previewX, previewY, previewSize);

    const nameFieldW = clamp(Math.min(previewCardW - 96, compactEditor ? 360 : 420), 240, 420);
    const nameFieldX = previewCardX + (previewCardW - nameFieldW) / 2;
    const nameFieldY = previewY + previewSize + 26;
    drawCenteredInputField(targetCtx, nameFieldX, nameFieldY, nameFieldW, 68, "人物姓名", state.profile.name || HERO_ROLE, "例如：像素冒险家", "profileName", false);

    const choiceCompact = bodyCardW < 860;
    const contentShift = -scroll;
    const selectorRowOneY = bodyViewportY + 18 + contentShift;
    const selectorRowTwoY = selectorRowOneY + selectorRowPitch;
    const selectorRowOneX = bodyViewportX + contentPad;
    const selectorRowTwoUsedW = selectorW * 3 + selectorGapX * 2;
    const selectorRowTwoX = bodyViewportX + contentPad + Math.max(0, Math.floor((contentW - selectorRowTwoUsedW) / 2));
    const selectorRows = [
      [
        { label: "肤色", value: state.profile.appearance.skin, onClick: function () { cycleAppearance(COLOR_OPTIONS.skin.map(function (entry) { return entry[0]; }), "skin"); } },
        { label: "瞳色", value: state.profile.appearance.eyeColor, onClick: function () { cycleAppearance(COLOR_OPTIONS.eyeColor.map(function (entry) { return entry[0]; }), "eyeColor"); } },
        { label: "发色", value: state.profile.appearance.hairColor, onClick: function () { cycleAppearance(COLOR_OPTIONS.hairColor.map(function (entry) { return entry[0]; }), "hairColor"); } },
        { label: "眼睛", value: state.profile.appearance.eyeStyle, onClick: function () { cycleAppearance(EYE_STYLES, "eyeStyle"); } }
      ],
      [
        { label: "嘴巴", value: state.profile.appearance.mouthStyle, onClick: function () { cycleAppearance(MOUTH_STYLES, "mouthStyle"); } },
        { label: "上装颜色", value: state.profile.appearance.topColor, onClick: function () { cycleAppearance(COLOR_OPTIONS.topColor.map(function (entry) { return entry[0]; }), "topColor"); } },
        { label: "下装颜色", value: state.profile.appearance.bottomColor, onClick: function () { cycleAppearance(COLOR_OPTIONS.bottomColor.map(function (entry) { return entry[0]; }), "bottomColor"); } }
      ]
    ];

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.rect(bodyViewportX, bodyViewportY, bodyViewportW, bodyViewportH);
    targetCtx.clip();

    const clipRect = { x: bodyViewportX, y: bodyViewportY, width: bodyViewportW, height: bodyViewportH };
    selectorRows[0].forEach(function (entry, index) {
      const x = selectorRowOneX + index * (selectorW + selectorGapX);
      const y = selectorRowOneY;
      const fieldY = y + 22;
      const register = fieldY >= bodyViewportY && fieldY + selectorFieldH <= bodyViewportY + bodyViewportH;
      drawCompactSelectorField(targetCtx, x, y, selectorW, selectorFieldH, entry.label, entry.value, entry.onClick, register, clipRect);
    });
    selectorRows[1].forEach(function (entry, index) {
      const x = selectorRowTwoX + index * (selectorW + selectorGapX);
      const y = selectorRowTwoY;
      const fieldY = y + 22;
      const register = fieldY >= bodyViewportY && fieldY + selectorFieldH <= bodyViewportY + bodyViewportH;
      drawCompactSelectorField(targetCtx, x, y, selectorW, selectorFieldH, entry.label, entry.value, entry.onClick, register, clipRect);
    });

    let rowY = bodyViewportY + collectionStartOffset + contentShift;
    drawEditorChoiceRow(targetCtx, bodyViewportX + contentPad, rowY, contentW, "backgrounds", "已拥有背景", state.collection.backgrounds.map(function (value) {
      return { label: value, width: choiceCompact ? 120 : 170, active: state.profile.appearance.background === value, onClick: function () { equipAppearanceFromCollection("background", value); } };
    }), clipRect);
    rowY += choiceRowPitch;
    drawEditorChoiceRow(targetCtx, bodyViewportX + contentPad, rowY, contentW, "hair", "已拥有发型", state.collection.hairStyles.map(function (value) {
      return { label: value, width: choiceCompact ? 100 : 140, active: state.profile.appearance.hairStyle === value, onClick: function () { equipAppearanceFromCollection("hairStyle", value); } };
    }), clipRect);
    rowY += choiceRowPitch;
    drawEditorChoiceRow(targetCtx, bodyViewportX + contentPad, rowY, contentW, "tops", "已拥有上装", state.collection.topStyles.map(function (value) {
      return { label: value, width: choiceCompact ? 120 : 170, active: state.profile.appearance.topStyle === value, onClick: function () { equipAppearanceFromCollection("topStyle", value); } };
    }), clipRect);
    rowY += choiceRowPitch;
    drawEditorChoiceRow(targetCtx, bodyViewportX + contentPad, rowY, contentW, "bottoms", "已拥有下装", state.collection.bottomStyles.map(function (value) {
      return { label: value, width: choiceCompact ? 120 : 170, active: state.profile.appearance.bottomStyle === value, onClick: function () { equipAppearanceFromCollection("bottomStyle", value); } };
    }), clipRect);
    rowY += choiceRowPitch;
    drawEditorChoiceRow(targetCtx, bodyViewportX + contentPad, rowY, contentW, "weapons", "已拥有装备", state.collection.weapons.map(function (value) {
      return {
        label: value,
        width: choiceCompact ? 120 : 160,
        active: value === "无"
          ? (state.profile.appearance.weaponLeft === "无" && state.profile.appearance.weaponRight === "无")
          : (state.profile.appearance.weaponLeft === value || state.profile.appearance.weaponRight === value),
        onClick: function () { equipAppearanceFromCollection("weapon", value); }
      };
    }), clipRect);
    rowY += choiceRowPitch;
    drawEditorChoiceRow(targetCtx, bodyViewportX + contentPad, rowY, contentW, "accessories", "已拥有配饰", state.collection.accessories.map(function (value) {
      return {
        label: value,
        width: choiceCompact ? 120 : 170,
        active: value === "无"
          ? (currentAccessories(state.profile.appearance).length === 0 || currentAccessories(state.profile.appearance).includes("无"))
          : currentAccessories(state.profile.appearance).includes(value),
        onClick: function () { equipAppearanceFromCollection("accessory", value); }
      };
    }), clipRect);
    targetCtx.restore();

    if (maxScroll > 0) {
      fillRect(targetCtx, bodyViewportX + bodyViewportW - 10, bodyViewportY, 6, bodyViewportH, "#5c342d");
      const thumbH = Math.max(56, bodyViewportH * (bodyViewportH / (bodyViewportH + maxScroll)));
      const thumbY = bodyViewportY + ((bodyViewportH - thumbH) * (scroll / maxScroll));
      fillRect(targetCtx, bodyViewportX + bodyViewportW - 12, thumbY, 10, thumbH, THEME.yellow);
      targetCtx.strokeStyle = THEME.black;
      targetCtx.lineWidth = 2;
      targetCtx.strokeRect(bodyViewportX + bodyViewportW - 12, thumbY, 10, thumbH);
    }
  }

  function renderOverlay(view) {
    overlayRegions.length = 0;
    overlayModalLayout = null;
    resizeOverlayCanvas(view);
    overlayCtx.clearRect(0, 0, view.logicalWidth, view.logicalHeight);
    overlayCanvas.style.touchAction = state.modal ? "none" : "auto";
    syncModalPageLock(Boolean(state.modal));
    if (state.modal) {
      overlayCanvas.style.pointerEvents = "auto";
      overlayCtx.save();
      overlayCtx.globalAlpha = 0.58;
      fillRect(overlayCtx, 0, 0, view.logicalWidth, view.logicalHeight, THEME.overlayShade);
      overlayCtx.restore();
      if (state.modal.type === "pomodoro") renderPomodoroModal(overlayCtx, view);
      else if (state.modal.type === "adventureStory") renderAdventureStoryModal(overlayCtx, view);
      else if (state.modal.type === "companionGiftShop") renderCompanionGiftShopModal(overlayCtx, view);
      else if (state.modal.type === "treasure") renderTreasureModal(overlayCtx, view);
      else if (state.modal.type === "settings") renderSettingsModal(overlayCtx, view);
      else if (state.modal.type === "editor") renderEditorModal(overlayCtx, view);
      else if (state.modal.type === "flappy") renderFlappyModal(overlayCtx, view);
      else if (state.modal.type === "hpWarning") renderHpWarningModal(overlayCtx, view);
      else if (state.modal.type === "exportConfirm") renderExportConfirmModal(overlayCtx, view);
      else if (state.modal.type === "exportReminder") renderExportReminderModal(overlayCtx, view);
      else if (state.modal.type === "importConfirm") renderImportConfirmModal(overlayCtx, view);
      else if (state.modal.type === "resetConfirm") renderResetConfirmModal(overlayCtx, view);
      else if (state.modal.type === "deleteCompletedTodoConfirm") renderDeleteCompletedTodoConfirmModal(overlayCtx, view);
      else if (state.modal.type === "modeConfirm") renderModeConfirmModal(overlayCtx, view);
      else if (state.modal.type === "rename") renderRenameModal(overlayCtx, view);
      else if (state.modal.type === "createChallenge") renderCreateChallengeModal(overlayCtx, view);
      else if (state.modal.type === "createReward") renderCreateRewardModal(overlayCtx, view);
      else if (state.modal.type === "codex") renderCodexModal(overlayCtx, view);
      else if (state.modal.type === "achievements") renderAchievementsModal(overlayCtx, view);
    } else {
      overlayCanvas.style.pointerEvents = "none";
    }
    renderHoverTooltip(overlayCtx, view);
    renderToast(overlayCtx, view);
  }

  function performPendingScroll() {
    if (!pendingScrollTarget || anchors[pendingScrollTarget] === undefined || !currentView) return;
    const top = Math.max(0, anchors[pendingScrollTarget] * currentView.scale - 20);
    window.scrollTo({ top: top, behavior: "smooth" });
    pendingScrollTarget = null;
  }

  function renderApp() {
    currentView = computeView();
    resizeMainCanvas(currentView, desiredDesignHeight);
    mainRegions.length = 0;
    companionStripLayout = null;
    Object.keys(anchors).forEach(function (key) { delete anchors[key]; });
    Object.keys(inputFieldMap).forEach(function (key) { delete inputFieldMap[key]; });
    ctx.clearRect(0, 0, currentView.logicalWidth, desiredDesignHeight);
    try {
      let usedHeight = renderMain(ctx, currentView);
      const nextHeight = Math.max(currentView.logicalHeight + 80, usedHeight);
      if (Math.abs(nextHeight - desiredDesignHeight) > 24) {
        desiredDesignHeight = nextHeight;
        resizeMainCanvas(currentView, desiredDesignHeight);
        mainRegions.length = 0;
        Object.keys(anchors).forEach(function (key) { delete anchors[key]; });
        Object.keys(inputFieldMap).forEach(function (key) { delete inputFieldMap[key]; });
        ctx.clearRect(0, 0, currentView.logicalWidth, desiredDesignHeight);
        usedHeight = renderMain(ctx, currentView);
        desiredDesignHeight = Math.max(currentView.logicalHeight + 80, usedHeight);
      }
    } catch (error) {
      console.error("renderApp failed", error);
      fillRect(ctx, 0, 0, currentView.logicalWidth, currentView.logicalHeight + 120, theme().background);
      renderBackground(ctx, currentView);
      renderHeader(ctx, currentView);
      drawPanel(ctx, currentView.left, 230, currentView.contentWidth, 220, theme().panelOuter, theme().panelShadow, theme().panelInner);
      drawText(ctx, "页面渲染失败", currentView.left + 48, 290, 34, theme().text, "600");
      drawText(ctx, String(error && error.message ? error.message : error), currentView.left + 48, 336, 18, theme().muted, "500");
    }
    renderOverlay(currentView);
    syncCanvasInput();
    performPendingScroll();
    maybeShowExportReminderModal();
  }

  function canvasPoint(event, canvas, view) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / view.scale, y: (event.clientY - rect.top) / view.scale };
  }

  function handleCanvasClick(event, regions, canvas) {
    if (!currentView) return;
    const point = canvasPoint(event, canvas, currentView);
    const region = hitTest(regions, point.x, point.y);
    const now = Date.now();
    if (region && region.regionKey && region.onDblClick && lastClick.key === region.regionKey && (now - lastClick.time) < 400) {
      lastClick.key = null;
      lastClick.time = 0;
      if (!region.keepInput) blurActiveInput();
      region.onDblClick();
      return;
    }
    if (!region) {
      lastClick.key = null;
      lastClick.time = 0;
      blurActiveInput();
      renderApp();
      return;
    }
    lastClick.key = region.regionKey || null;
    lastClick.time = now;
    if (!region.keepInput) blurActiveInput();
    region.onClick();
  }

  function handleCanvasMove(event, regions, canvas) {
    if (!currentView) return;
    const point = canvasPoint(event, canvas, currentView);
    const region = hitTest(regions, point.x, point.y);
    const nextCursor = region ? region.cursor : "default";
    if (nextCursor !== hoverCursor) {
      hoverCursor = nextCursor;
      canvas.style.cursor = nextCursor;
      if (canvas !== overlayCanvas) overlayCanvas.style.cursor = nextCursor;
    }
  }

  function clearHoverTooltip() {
    if (!hoverTooltip) return;
    hoverTooltip = null;
    if (currentView) renderOverlay(currentView);
  }

  function cancelTooltipLongPress(clearShownTooltip) {
    if (!tooltipLongPress) return false;
    const wasTriggered = Boolean(tooltipLongPress.triggered);
    if (tooltipLongPress.timer) clearTimeout(tooltipLongPress.timer);
    tooltipLongPress = null;
    if (clearShownTooltip && wasTriggered) clearHoverTooltip();
    return wasTriggered;
  }

  function beginTooltipLongPress(event, regions, canvas) {
    if (!currentView) return false;
    const point = canvasPoint(event, canvas, currentView);
    const region = hitTest(regions, point.x, point.y);
    if (!region || !region.tooltip) return false;
    const viewportPoint = canvas === overlayCanvas ? point : canvasPoint(event, overlayCanvas, currentView);
    cancelTooltipLongPress(false);
    tooltipLongPress = {
      pointerId: event.pointerId,
      canvas: canvas,
      regions: regions,
      region: region,
      startX: point.x,
      startY: point.y,
      anchorX: viewportPoint.x,
      anchorY: viewportPoint.y,
      triggered: false,
      timer: setTimeout(function () {
        if (!tooltipLongPress || tooltipLongPress.pointerId !== event.pointerId || tooltipLongPress.canvas !== canvas) return;
        tooltipLongPress.triggered = true;
        hoverTooltip = { text: region.tooltip, cursorX: viewportPoint.x, cursorY: viewportPoint.y, x: viewportPoint.x, y: viewportPoint.y };
        if (currentView) renderOverlay(currentView);
      }, LONG_PRESS_DELAY_MS)
    };
    return true;
  }

  function updateTooltipLongPress(event, canvas) {
    if (!tooltipLongPress || tooltipLongPress.pointerId !== event.pointerId || tooltipLongPress.canvas !== canvas || !currentView) return false;
    const point = canvasPoint(event, canvas, currentView);
    const moved = Math.abs(point.x - tooltipLongPress.startX) > LONG_PRESS_MOVE_TOLERANCE || Math.abs(point.y - tooltipLongPress.startY) > LONG_PRESS_MOVE_TOLERANCE;
    if (moved) {
      cancelTooltipLongPress(true);
      return false;
    }
    return true;
  }

  function finishTooltipLongPress(event, regions, canvas) {
    if (!tooltipLongPress || tooltipLongPress.pointerId !== event.pointerId || tooltipLongPress.canvas !== canvas || !currentView) return false;
    const point = canvasPoint(event, canvas, currentView);
    const tapLike = Math.abs(point.x - tooltipLongPress.startX) < LONG_PRESS_MOVE_TOLERANCE && Math.abs(point.y - tooltipLongPress.startY) < LONG_PRESS_MOVE_TOLERANCE;
    const triggered = Boolean(tooltipLongPress.triggered);
    cancelTooltipLongPress(false);
    if (triggered) {
      event.preventDefault();
      return true;
    }
    if (tapLike) {
      handleCanvasClick(event, regions, canvas);
      event.preventDefault();
      return true;
    }
    return true;
  }

  function pointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
  }

  function handleMainPointerDown(event) {
    if (!currentView) return;
    clearHoverTooltip();
    const point = canvasPoint(event, mainCanvas, currentView);
    if (companionStripLayout && pointInRect(point, companionStripLayout.area)) {
      blurActiveInput();
      mainScrollGesture = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        scrollStart: Number(state.companionStripScroll) || 0,
        maxScroll: Math.max(0, Number(companionStripLayout.maxScroll) || 0),
        scrolling: false,
        captured: false
      };
      return;
    }
    if (beginTooltipLongPress(event, mainRegions, mainCanvas)) return;
    handleCanvasClick(event, mainRegions, mainCanvas);
  }

  function handleMainPointerMove(event) {
    if (!currentView) return;
    if (mainScrollGesture && mainScrollGesture.pointerId === event.pointerId) {
      const point = canvasPoint(event, mainCanvas, currentView);
      const totalX = point.x - mainScrollGesture.startX;
      const totalY = point.y - mainScrollGesture.startY;
      if (!mainScrollGesture.scrolling && Math.abs(totalX) > 6 && Math.abs(totalX) >= Math.abs(totalY)) {
        mainScrollGesture.scrolling = true;
        if (!mainScrollGesture.captured) {
          try { mainCanvas.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
          mainScrollGesture.captured = true;
        }
      }
      if (mainScrollGesture.scrolling) {
        const nextScroll = clamp(mainScrollGesture.scrollStart - totalX, 0, mainScrollGesture.maxScroll);
        if (nextScroll !== (Number(state.companionStripScroll) || 0)) {
          state.companionStripScroll = nextScroll;
          renderApp();
        }
        event.preventDefault();
        return;
      }
      return;
    }
    if (updateTooltipLongPress(event, mainCanvas)) return;
    handleCanvasMove(event, mainRegions, mainCanvas);
  }

  function handleMainPointerUp(event) {
    if (finishTooltipLongPress(event, mainRegions, mainCanvas)) return;
    if (!mainScrollGesture || mainScrollGesture.pointerId !== event.pointerId) return;
    const point = currentView ? canvasPoint(event, mainCanvas, currentView) : { x: mainScrollGesture.startX, y: mainScrollGesture.startY };
    const tapLike = !mainScrollGesture.scrolling && Math.abs(point.x - mainScrollGesture.startX) < 6 && Math.abs(point.y - mainScrollGesture.startY) < 6;
    const didScroll = mainScrollGesture.scrolling;
    if (mainScrollGesture.captured) {
      try { mainCanvas.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
    }
    mainScrollGesture = null;
    if (tapLike) handleCanvasClick(event, mainRegions, mainCanvas);
    else {
      lastClick.key = null;
      lastClick.time = 0;
      if (didScroll) saveState();
    }
    event.preventDefault();
  }

  function getActiveModalScrollInfo() {
    if (!state.modal || !overlayModalLayout) return null;
    const modalType = state.modal.type;
    if (modalType !== "editor" && modalType !== "pomodoro" && modalType !== "codex" && modalType !== "achievements") return null;
    const maxScroll = Math.max(0, Number(state.modal.maxScroll) || 0);
    if (maxScroll <= 0) return null;
    const area = overlayModalLayout.scrollArea || { x: overlayModalLayout.x, y: overlayModalLayout.y, width: overlayModalLayout.width, height: overlayModalLayout.height };
    return { area: area, maxScroll: maxScroll };
  }

  function scrollActiveModalBy(delta) {
    if (!state.modal) return false;
    const maxScroll = Math.max(0, Number(state.modal.maxScroll) || 0);
    if (maxScroll <= 0) return false;
    const current = Number(state.modal.scroll) || 0;
    const next = clamp(current + delta, 0, maxScroll);
    if (next === current) return false;
    state.modal.scroll = next;
    renderApp();
    return true;
  }

  function handleOverlayPointerDown(event) {
    if (!currentView) return;
    clearHoverTooltip();
    const point = canvasPoint(event, overlayCanvas, currentView);
    if (state.modal && overlayModalLayout && overlayModalLayout.type === "pomodoro") {
      const closeRect = { x: overlayModalLayout.x + overlayModalLayout.width - 108, y: overlayModalLayout.y + 24, width: 74, height: 62 };
      if (pointInRect(point, overlayModalLayout.header) && !pointInRect(point, closeRect)) {
        blurActiveInput();
        overlayDrag = {
          pointerId: event.pointerId,
          offsetX: point.x - overlayModalLayout.x,
          offsetY: point.y - overlayModalLayout.y
        };
        try { overlayCanvas.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
        event.preventDefault();
        overlayCanvas.style.cursor = "grabbing";
        return;
      }
    }
    const scrollInfo = getActiveModalScrollInfo();
    if (scrollInfo && pointInRect(point, scrollInfo.area)) {
      blurActiveInput();
      overlayScrollGesture = {
        pointerId: event.pointerId,
        startX: point.x,
        startY: point.y,
        lastY: point.y,
        scrolling: false
      };
      try { overlayCanvas.setPointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      event.preventDefault();
      return;
    }
    if (beginTooltipLongPress(event, overlayRegions, overlayCanvas)) return;
    handleCanvasClick(event, overlayRegions, overlayCanvas);
  }

  function handleOverlayPointerMove(event) {
    if (!currentView) return;
    if (overlayDrag && overlayDrag.pointerId === event.pointerId && state.modal && overlayModalLayout) {
      const point = canvasPoint(event, overlayCanvas, currentView);
      const padding = 20;
      const x = clamp(point.x - overlayDrag.offsetX, padding, currentView.logicalWidth - overlayModalLayout.width - padding);
      const y = clamp(point.y - overlayDrag.offsetY, padding, currentView.logicalHeight - overlayModalLayout.height - padding);
      state.modal.position = { x: x, y: y };
      renderApp();
      event.preventDefault();
      return;
    }
    if (overlayScrollGesture && overlayScrollGesture.pointerId === event.pointerId) {
      const point = canvasPoint(event, overlayCanvas, currentView);
      const totalX = point.x - overlayScrollGesture.startX;
      const totalY = point.y - overlayScrollGesture.startY;
      if (!overlayScrollGesture.scrolling && Math.abs(totalY) > 6 && Math.abs(totalY) >= Math.abs(totalX)) {
        overlayScrollGesture.scrolling = true;
      }
      if (overlayScrollGesture.scrolling) {
        const delta = overlayScrollGesture.lastY - point.y;
        overlayScrollGesture.lastY = point.y;
        if (delta !== 0) scrollActiveModalBy(delta);
        event.preventDefault();
        return;
      }
      overlayScrollGesture.lastY = point.y;
      return;
    }
    if (updateTooltipLongPress(event, overlayCanvas)) return;
    handleCanvasMove(event, overlayRegions, overlayCanvas);
  }

  function handleOverlayPointerUp(event) {
    if (finishTooltipLongPress(event, overlayRegions, overlayCanvas)) return;
    if (overlayDrag && overlayDrag.pointerId === event.pointerId) {
      overlayDrag = null;
      try { overlayCanvas.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      saveState();
      renderApp();
      return;
    }
    if (overlayScrollGesture && overlayScrollGesture.pointerId === event.pointerId) {
      const point = canvasPoint(event, overlayCanvas, currentView);
      const tapLike = !overlayScrollGesture.scrolling && Math.abs(point.x - overlayScrollGesture.startX) < 6 && Math.abs(point.y - overlayScrollGesture.startY) < 6;
      overlayScrollGesture = null;
      try { overlayCanvas.releasePointerCapture(event.pointerId); } catch (error) { /* ignore */ }
      if (tapLike) handleCanvasClick(event, overlayRegions, overlayCanvas);
      else {
        lastClick.key = null;
        lastClick.time = 0;
      }
      event.preventDefault();
    }
  }

  mainCanvas.addEventListener("pointerdown", handleMainPointerDown);
  overlayCanvas.addEventListener("pointerdown", handleOverlayPointerDown);
  mainCanvas.addEventListener("pointermove", handleMainPointerMove);
  overlayCanvas.addEventListener("pointermove", handleOverlayPointerMove);
  mainCanvas.addEventListener("pointerup", handleMainPointerUp);
  mainCanvas.addEventListener("pointercancel", handleMainPointerUp);
  overlayCanvas.addEventListener("pointerup", handleOverlayPointerUp);
  overlayCanvas.addEventListener("pointercancel", handleOverlayPointerUp);
  mainCanvas.addEventListener("pointerleave", function () { cancelTooltipLongPress(true); hoverCursor = "default"; mainCanvas.style.cursor = "default"; overlayCanvas.style.cursor = "default"; if (currentView) renderOverlay(currentView); });
  overlayCanvas.addEventListener("pointerleave", function () { cancelTooltipLongPress(true); hoverCursor = "default"; mainCanvas.style.cursor = "default"; overlayCanvas.style.cursor = "default"; if (currentView) renderOverlay(currentView); });
  mainCanvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  overlayCanvas.addEventListener("contextmenu", function (event) { event.preventDefault(); });
  overlayCanvas.addEventListener("wheel", function (event) {
    if (!state.modal) return;
    const scrollInfo = getActiveModalScrollInfo();
    if (scrollInfo) {
      event.preventDefault();
      scrollActiveModalBy(event.deltaY > 0 ? 72 : -72);
    }
  }, { passive: false });
  window.addEventListener("resize", renderApp);
  window.addEventListener("scroll", syncCanvasInput, { passive: true });

  setInterval(function () {
    const timersChanged = updateTimers();
    let deadlineTickChanged = false;
    if (hasActiveTodoDeadlineCountdown()) {
      const nowSecond = Math.floor(Date.now() / 1000);
      if (lastTodoDeadlineRenderSecond !== nowSecond) {
        lastTodoDeadlineRenderSecond = nowSecond;
        deadlineTickChanged = true;
      }
    } else {
      lastTodoDeadlineRenderSecond = null;
    }
    if (timersChanged || deadlineTickChanged) renderApp();
  }, 250);

  renderApp();
})();
