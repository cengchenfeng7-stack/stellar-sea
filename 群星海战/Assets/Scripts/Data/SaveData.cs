using System;
using System.Collections.Generic;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace StellarSea.Data
{
    /// <summary>
    /// 存档根对象。字段与《群星海战》V3.3 第 23 章一致。
    /// 所有时间均为 UTC Unix 毫秒；每日重置另记 resetDay（设备本地 04:00 的日期）。
    /// </summary>
    [Serializable]
    public sealed class SaveData
    {
        [JsonProperty("meta")] public MetaData meta = new MetaData();
        [JsonProperty("player")] public PlayerData player = new PlayerData();
        [JsonProperty("ships")] public List<ShipInstance> ships = new List<ShipInstance>();
        [JsonProperty("captains")] public List<CaptainInstance> captains = new List<CaptainInstance>();
        [JsonProperty("equipment")] public List<EquipmentInstance> equipment = new List<EquipmentInstance>();
        [JsonProperty("formation")] public FormationData formation = new FormationData();
        [JsonProperty("progress")] public ProgressData progress = new ProgressData();
        [JsonProperty("trade")] public TradeData trade = new TradeData();
        [JsonProperty("gacha")] public GachaData gacha = new GachaData();
        [JsonProperty("base")] public BaseData baseData = new BaseData();
        [JsonProperty("tasks")] public TaskData tasks = new TaskData();
        [JsonProperty("settings")] public SettingsData settings = new SettingsData();

        /// <summary>未知字段保留：降版本读取时不会丢数据。</summary>
        [JsonExtensionData] public Dictionary<string, JToken> unknownFields = new Dictionary<string, JToken>();
    }

    [Serializable]
    public sealed class MetaData
    {
        [JsonProperty("schemaVersion")] public int schemaVersion = 1;
        [JsonProperty("saveId")] public string saveId = string.Empty;
        [JsonProperty("createdAt")] public long createdAt;
        [JsonProperty("lastSavedAt")] public long lastSavedAt;
        [JsonProperty("lastSettleAt")] public long lastSettleAt;
        [JsonProperty("clockRollbackDetected")] public bool clockRollbackDetected;
        [JsonExtensionData] public Dictionary<string, JToken> unknownFields = new Dictionary<string, JToken>();
    }

    [Serializable]
    public sealed class PlayerData
    {
        [JsonProperty("gold")] public long gold;
        [JsonProperty("diamond")] public long diamond;
        [JsonProperty("material")] public long material;
        [JsonProperty("blueprint")] public long blueprint;
        [JsonProperty("expBook")] public long expBook;
        [JsonProperty("skillBook")] public long skillBook;
        [JsonProperty("shard")] public long shard;
        [JsonProperty("shipCapacity")] public int shipCapacity = 20;
        [JsonProperty("equipCapacity")] public int equipCapacity = 100;
        [JsonProperty("captainCapacity")] public int captainCapacity = 20;
        [JsonProperty("baseLevel")] public int baseLevel = 1;
        [JsonExtensionData] public Dictionary<string, JToken> unknownFields = new Dictionary<string, JToken>();
    }

    [Serializable]
    public sealed class ShipInstance
    {
        [JsonProperty("instanceId")] public string instanceId = string.Empty;
        [JsonProperty("configId")] public string configId = string.Empty;
        [JsonProperty("level")] public int level = 1;
        [JsonProperty("star")] public int star = 1;
        [JsonProperty("remodelTier")] public int remodelTier;
        [JsonProperty("equipInstanceIds")] public List<string> equipInstanceIds = new List<string>();
        [JsonProperty("captainInstanceId")] public string captainInstanceId = string.Empty;
    }

    [Serializable]
    public sealed class CaptainInstance
    {
        [JsonProperty("instanceId")] public string instanceId = string.Empty;
        [JsonProperty("configId")] public string configId = string.Empty;
        [JsonProperty("level")] public int level = 1;
        [JsonProperty("star")] public int star = 1;
        [JsonProperty("assignedShipInstanceId")] public string assignedShipInstanceId = string.Empty;
    }

    [Serializable]
    public sealed class EquipmentInstance
    {
        [JsonProperty("instanceId")] public string instanceId = string.Empty;
        [JsonProperty("configId")] public string configId = string.Empty;
        [JsonProperty("enhanceLevel")] public int enhanceLevel;
        [JsonProperty("equippedShipInstanceId")] public string equippedShipInstanceId = string.Empty;
        [JsonProperty("equippedSlotIndex")] public int equippedSlotIndex = -1;
    }

    [Serializable]
    public sealed class FormationData
    {
        [JsonProperty("front")] public List<string> front = new List<string>();
        [JsonProperty("back")] public List<string> back = new List<string>();
        [JsonProperty("flagship")] public string flagship = string.Empty;
        [JsonProperty("escorts")] public List<string> escorts = new List<string>();
    }

    [Serializable]
    public sealed class ProgressData
    {
        /// <summary>stageId -> 星级（0 表示未通关）。</summary>
        [JsonProperty("stageStars")] public Dictionary<string, int> stageStars = new Dictionary<string, int>();
        [JsonProperty("idleStageId")] public string idleStageId = string.Empty;
        [JsonProperty("dailySweepCounts")] public Dictionary<string, int> dailySweepCounts = new Dictionary<string, int>();
        [JsonProperty("sweepResetDay")] public string sweepResetDay = string.Empty;
        [JsonProperty("firstClearClaimed")] public List<string> firstClearClaimed = new List<string>();
        [JsonProperty("eliteRemaining")] public Dictionary<string, int> eliteRemaining = new Dictionary<string, int>();
    }

    [Serializable]
    public sealed class TradeData
    {
        [JsonProperty("unlockedPorts")] public List<string> unlockedPorts = new List<string>();
        [JsonProperty("tradeLevel")] public int tradeLevel = 1;
        [JsonProperty("tradeExp")] public long tradeExp;
        [JsonProperty("routeSlots")] public int routeSlots = 1;
        [JsonProperty("tradeShips")] public List<TradeShipInstance> tradeShips = new List<TradeShipInstance>();
        [JsonProperty("routes")] public List<RouteState> routes = new List<RouteState>();
        [JsonProperty("priceSeed")] public long priceSeed;
        [JsonProperty("dailyTradeAmounts")] public Dictionary<string, long> dailyTradeAmounts = new Dictionary<string, long>();
        [JsonProperty("tradeResetDay")] public string tradeResetDay = string.Empty;
    }

    [Serializable]
    public sealed class TradeShipInstance
    {
        [JsonProperty("instanceId")] public string instanceId = string.Empty;
        [JsonProperty("configId")] public string configId = string.Empty;
        [JsonProperty("routeId")] public string routeId = string.Empty;
        [JsonProperty("dockedPortId")] public string dockedPortId = string.Empty;
        [JsonProperty("state")] public string state = "idle";
    }

    [Serializable]
    public sealed class RouteState
    {
        [JsonProperty("routeId")] public string routeId = string.Empty;
        [JsonProperty("tradeShipInstanceId")] public string tradeShipInstanceId = string.Empty;
        [JsonProperty("state")] public string state = "idle";
        [JsonProperty("departAt")] public long departAt;
        [JsonProperty("arriveAt")] public long arriveAt;
        [JsonProperty("returnAt")] public long returnAt;
        [JsonProperty("outboundCargo")] public List<RouteCargo> outboundCargo = new List<RouteCargo>();
        [JsonProperty("returnCargo")] public List<RouteCargo> returnCargo = new List<RouteCargo>();
        [JsonProperty("returnBudget")] public long returnBudget;
        [JsonProperty("escortShipInstanceIds")] public List<string> escortShipInstanceIds = new List<string>();
        [JsonProperty("collectPending")] public bool collectPending;
    }

    [Serializable]
    public sealed class RouteCargo
    {
        [JsonProperty("goodId")] public string goodId = string.Empty;
        [JsonProperty("quantity")] public int quantity;
        [JsonProperty("buyPrice")] public long buyPrice;
    }

    [Serializable]
    public sealed class GachaData
    {
        [JsonProperty("pools")] public Dictionary<string, GachaPoolState> pools = new Dictionary<string, GachaPoolState>();
        [JsonProperty("newbiePoolUsed")] public bool newbiePoolUsed;
        [JsonProperty("newbieCouponUsed")] public bool newbieCouponUsed;
        [JsonProperty("selectedSsShipId")] public string selectedSsShipId = string.Empty;
        [JsonProperty("totalPulls")] public long totalPulls;
    }

    [Serializable]
    public sealed class GachaPoolState
    {
        [JsonProperty("ssCount")] public int ssCount;
        [JsonProperty("sCount")] public int sCount;
        [JsonProperty("aCount")] public int aCount;
        [JsonProperty("guaranteeUp")] public bool guaranteeUp;
    }

    [Serializable]
    public sealed class BaseData
    {
        [JsonProperty("baseLevel")] public int baseLevel = 1;
        [JsonProperty("buildingLevels")] public Dictionary<string, int> buildingLevels = new Dictionary<string, int>();
        [JsonProperty("upgradeQueue")] public List<BuildingUpgrade> upgradeQueue = new List<BuildingUpgrade>();
    }

    [Serializable]
    public sealed class BuildingUpgrade
    {
        [JsonProperty("buildingId")] public string buildingId = string.Empty;
        [JsonProperty("targetLevel")] public int targetLevel;
        [JsonProperty("startAt")] public long startAt;
        [JsonProperty("endAt")] public long endAt;
    }

    [Serializable]
    public sealed class TaskData
    {
        [JsonProperty("dailyProgress")] public Dictionary<string, long> dailyProgress = new Dictionary<string, long>();
        [JsonProperty("weeklyProgress")] public Dictionary<string, long> weeklyProgress = new Dictionary<string, long>();
        [JsonProperty("achievementProgress")] public Dictionary<string, long> achievementProgress = new Dictionary<string, long>();
        [JsonProperty("claimedTaskIds")] public List<string> claimedTaskIds = new List<string>();
        [JsonProperty("lastDailyResetDay")] public string lastDailyResetDay = string.Empty;
        [JsonProperty("lastWeeklyResetDay")] public string lastWeeklyResetDay = string.Empty;
    }

    [Serializable]
    public sealed class SettingsData
    {
        [JsonProperty("battleSpeed")] public int battleSpeed = 1;
        [JsonProperty("autoBattle")] public bool autoBattle = true;
        [JsonProperty("bgmVolume")] public float bgmVolume = 0.7f;
        [JsonProperty("sfxVolume")] public float sfxVolume = 0.8f;
        [JsonProperty("lastExportPath")] public string lastExportPath = string.Empty;
    }
}
