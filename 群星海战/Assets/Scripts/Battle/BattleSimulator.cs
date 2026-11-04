using System;
using System.Collections.Generic;

namespace StellarSea.Battle
{
    public sealed class BattleSetup
    {
        public string seed = "1";
        public int maxRounds = 30;
        public readonly List<UnitSpec> allies = new List<UnitSpec>();
        public readonly List<UnitSpec> enemies = new List<UnitSpec>();
        public readonly Dictionary<string, SkillSpec> skills = new Dictionary<string, SkillSpec>(StringComparer.Ordinal);
        public readonly List<ComboSpec> combos = new List<ComboSpec>();
        /// <summary>旗舰不参与行动条，但技能按旗舰面板结算；为空表示没有旗舰。</summary>
        public UnitSpec flagship;

        public SkillSpec Skill(string id)
        {
            if (string.IsNullOrEmpty(id)) return null;
            return skills.TryGetValue(id, out var skill) ? skill : null;
        }
    }

    /// <summary>
    /// 纯数据战斗模拟：同一 seed + 同一阵容结果一致，表现层只订阅 events。
    /// 规则见设计文档第 5 章。
    /// </summary>
    public sealed class BattleSimulator
    {
        private const double RoundLength = 100.0;
        private const int MaxRage = 100;

        private readonly BattleSetup _setup;
        private readonly BattleRng _rng;
        private readonly List<BattleUnit> _allies = new List<BattleUnit>();
        private readonly List<BattleUnit> _enemies = new List<BattleUnit>();
        private readonly List<BattleUnit> _units = new List<BattleUnit>();
        private readonly HashSet<string> _usedCombos = new HashSet<string>(StringComparer.Ordinal);
        private readonly BattleResult _result = new BattleResult();

        private BattleUnit _flagship;
        private double _time;
        private int _round;
        private int _lastTriggeredRound;
        private int _allySeq;
        private int _enemySeq;

        public BattleSimulator(BattleSetup setup)
        {
            _setup = setup ?? throw new ArgumentNullException(nameof(setup));
            _rng = new BattleRng(BattleRng.SeedFromString(setup.seed));
            _result.seed = setup.seed ?? string.Empty;
        }

        public BattleResult Run()
        {
            BuildUnits();
            ApplyBattleStart();

            Emit(BattleEventKind.BattleStarted, null, null, null, 0, 0, $"allies={_allies.Count} enemies={_enemies.Count}");

            while (true)
            {
                if (!HasAlive(_enemies))
                {
                    End(true, false);
                    break;
                }
                if (!HasAlive(_allies))
                {
                    End(false, false);
                    break;
                }

                BattleUnit actor = NextActor();
                if (actor == null) { End(false, true); break; }

                Advance(actor);

                if (_time > _setup.maxRounds * RoundLength)
                {
                    End(false, true);
                    break;
                }

                ProcessRoundTriggers();

                if (actor.IsStunned)
                {
                    ExpireBuffs();
                    ResetActionValue(actor);
                    continue;
                }

                TakeTurn(actor);
                ExpireBuffs();

                if (!HasAlive(_enemies)) { End(true, false); break; }
                if (!HasAlive(_allies)) { End(false, false); break; }
            }

            _result.rounds = Math.Min(_round, _setup.maxRounds);
            _result.allyDeaths = CountDeaths(_allies);
            _result.enemyDeaths = CountDeaths(_enemies);
            _result.events.AddRange(_events);
            return _result;
        }

        private readonly List<BattleEvent> _events = new List<BattleEvent>();

        private void BuildUnits()
        {
            for (int i = 0; i < _setup.allies.Count; i++)
            {
                var spec = _setup.allies[i];
                var unit = new BattleUnit(spec, $"A{_allySeq++}", i < 3 ? 0 : 1, i % 3);
                _allies.Add(unit);
                _units.Add(unit);
            }
            for (int i = 0; i < _setup.enemies.Count; i++)
            {
                var spec = _setup.enemies[i];
                var unit = new BattleUnit(spec, $"E{_enemySeq++}", i < 3 ? 0 : 1, i % 3);
                _enemies.Add(unit);
                _units.Add(unit);
            }
            if (_setup.flagship != null)
            {
                _flagship = new BattleUnit(_setup.flagship, "F0", 0, 0);
                _flagship.actionValue = double.MaxValue;
            }
        }

        private void ApplyBattleStart()
        {
            // 战斗开始被动/专属：护盾、常驻面板加成。
            foreach (var unit in _units)
            {
                var passive = _setup.Skill(unit.spec.passiveSkillId);
                if (passive != null && passive.trigger == TriggerKind.Always && passive.condition == ConditionKind.None)
                    ApplyEffects(unit, passive, new List<BattleUnit> { unit }, permanent: true);

                var exclusive = _setup.Skill(unit.spec.exclusiveSkillId);
                if (exclusive == null) continue;
                if (exclusive.trigger == TriggerKind.BattleStart)
                    CastSkill(unit, exclusive);
                else if (exclusive.trigger == TriggerKind.Always && exclusive.condition == ConditionKind.None)
                    ApplyEffects(unit, exclusive, new List<BattleUnit> { unit }, permanent: true);
            }

            // 潮汐祝福：友军首次致命伤害免疫（每场一次）。
            foreach (var ally in _allies)
            {
                var owner = FindExclusiveOwner(EffectKind.Immunity);
                if (owner == null) break;
                ally.AddBuff(new ActiveBuff
                {
                    kind = EffectKind.Immunity,
                    value = 20,
                    sourceId = owner.unitId,
                    appliedAt = 0,
                    expireAt = -1,
                    pool = 1,
                    dispellable = false,
                });
            }
        }

        private BattleUnit FindExclusiveOwner(EffectKind kind)
        {
            foreach (var unit in _allies)
            {
                var skill = _setup.Skill(unit.spec.exclusiveSkillId);
                if (skill != null && skill.HasEffect(kind)) return unit;
            }
            return null;
        }

        private BattleUnit NextActor()
        {
            BattleUnit best = null;
            foreach (var unit in _units)
            {
                if (!unit.alive) continue;
                if (best == null) { best = unit; continue; }
                if (unit.actionValue < best.actionValue - 1e-9)
                {
                    best = unit;
                }
                else if (Math.Abs(unit.actionValue - best.actionValue) <= 1e-9)
                {
                    // 同速：我方先于敌方，同侧按站位顺序。
                    if (unit.side != best.side)
                    {
                        if (unit.side == BattleSide.Ally) best = unit;
                    }
                    else if (unit.row < best.row || (unit.row == best.row && unit.slot < best.slot))
                    {
                        best = unit;
                    }
                }
            }
            return best;
        }

        private void Advance(BattleUnit actor)
        {
            double delta = actor.actionValue;
            if (delta < 0) delta = 0;
            _time += delta;
            foreach (var unit in _units)
            {
                if (unit.alive) unit.actionValue -= delta;
            }
            _round = (int)Math.Floor((_time + 1e-9) / RoundLength);
        }

        private void ProcessRoundTriggers()
        {
            while (_lastTriggeredRound < _round)
            {
                _lastTriggeredRound++;
                int r = _lastTriggeredRound;

                TickDots(r);

                if (_flagship != null)
                {
                    var skill = _setup.Skill(_flagship.spec.flagshipSkillId);
                    if (skill != null && r >= 3 && (r - 3) % 4 == 0)
                        CastFlagship(skill, r);
                }

                foreach (var unit in _allies)
                {
                    if (!unit.alive) continue;
                    var skill = _setup.Skill(unit.spec.exclusiveSkillId);
                    if (skill != null && skill.trigger == TriggerKind.Round3_6_9 && r >= 3 && r % 3 == 0)
                        CastSkill(unit, skill);
                }

                Emit(BattleEventKind.RoundStarted, null, null, null, r, 0, string.Empty);
            }
        }

        private void TickDots(int round)
        {
            foreach (var unit in _units)
            {
                if (!unit.alive) continue;
                for (int i = unit.buffs.Count - 1; i >= 0; i--)
                {
                    var buff = unit.buffs[i];
                    if (buff.kind != EffectKind.Dot) continue;
                    var source = FindUnit(buff.sourceId);
                    int atk = source != null && source.alive ? source.Atk : 0;
                    int dmg = Math.Max(1, atk * buff.value / 100);
                    DealDamage(source, unit, dmg, direct: false, skillId: string.Empty);
                    if (!unit.alive) break;
                }
            }
        }

        private void TakeTurn(BattleUnit actor)
        {
            Emit(BattleEventKind.ActionStarted, actor, null, null, actor.rage, actor.hp, string.Empty);

            if (actor.rage >= MaxRage)
            {
                if (TryCombo(actor)) { ResetActionValue(actor); return; }

                var rage = _setup.Skill(actor.spec.rageSkillId);
                if (rage != null)
                {
                    actor.rage = 0;
                    CastSkill(actor, rage);
                    TriggerAfterAction(actor);
                    ResetActionValue(actor);
                    return;
                }
            }

            BasicAttack(actor);
            TriggerAfterAction(actor);
            ResetActionValue(actor);
        }

        private void BasicAttack(BattleUnit actor)
        {
            var targets = SelectTargets(actor, null);
            var target = targets.Count > 0 ? targets[0] : null;
            if (target == null) return;

            Emit(BattleEventKind.BasicAttack, actor, target, null, 0, target.hp, string.Empty);
            int dmg = ComputeDamage(actor, target, 100, 0, null);
            DealDamage(actor, target, dmg, direct: true, skillId: string.Empty);
            GainRage(actor, 20);
            TriggerOnHit(actor, target, dmg, allowAfterAttack: true);
        }

        private bool TryCombo(BattleUnit actor)
        {
            ComboSpec chosen = null;
            foreach (var combo in _setup.combos)
            {
                if (combo.shipA != actor.spec.configId && combo.shipB != actor.spec.configId) continue;
                if (_usedCombos.Contains(combo.id)) continue;
                var partnerId = combo.shipA == actor.spec.configId ? combo.shipB : combo.shipA;
                var partner = FindAllyByConfig(partnerId);
                if (partner == null || !partner.alive || partner.rage < MaxRage) continue;
                if (chosen == null || combo.priority < chosen.priority) chosen = combo;
            }
            if (chosen == null) return false;

            var skill = _setup.Skill(chosen.skillId);
            if (skill == null) return false;

            _usedCombos.Add(chosen.id);
            actor.rage = 0;
            var partnerUnit = FindAllyByConfig(chosen.shipA == actor.spec.configId ? chosen.shipB : chosen.shipA);
            if (partnerUnit != null) partnerUnit.rage = 0;

            Emit(BattleEventKind.ComboCast, actor, partnerUnit, skill.id, 0, actor.hp, chosen.id);
            CastSkill(actor, skill);
            return true;
        }

        private void CastSkill(BattleUnit actor, SkillSpec skill)
        {
            var targets = SelectTargets(actor, skill);
            Emit(BattleEventKind.SkillCast, actor, targets.Count > 0 ? targets[0] : null, skill.id, 0, actor.hp, skill.name);

            if (skill.power > 0)
            {
                if (IsAllyTargeting(skill.target))
                {
                    HealTargets(actor, skill, targets);
                }
                else
                {
                    foreach (var target in targets)
                    {
                        if (!target.alive) continue;
                        int dmg = ComputeDamage(actor, target, skill.power, skill.defPenetration, skill);
                        DealDamage(actor, target, dmg, direct: true, skillId: skill.id);
                        TriggerOnHit(actor, target, dmg, allowAfterAttack: false);
                    }
                }
            }

            ApplyEffects(actor, skill, targets, permanent: false);
        }

        private void CastFlagship(SkillSpec skill, int round)
        {
            var targets = SelectTargets(_flagship, skill);
            Emit(BattleEventKind.FlagshipCast, _flagship, targets.Count > 0 ? targets[0] : null, skill.id, round, 0, skill.name);

            if (skill.power > 0)
            {
                if (IsAllyTargeting(skill.target))
                {
                    HealTargets(_flagship, skill, targets);
                }
                else
                {
                    foreach (var target in targets)
                    {
                        if (!target.alive) continue;
                        int dmg = ComputeDamage(_flagship, target, skill.power, skill.defPenetration, skill);
                        DealDamage(_flagship, target, dmg, direct: true, skillId: skill.id);
                    }
                }
            }
            ApplyEffects(_flagship, skill, targets, permanent: false);
        }

        private void ApplyEffects(BattleUnit source, SkillSpec skill, List<BattleUnit> targets, bool permanent)
        {
            double expire = permanent || skill.durationRounds <= 0 ? -1 : _time + skill.durationRounds * RoundLength;

            foreach (var effect in skill.effects)
            {
                switch (effect.kind)
                {
                    case EffectKind.None:
                        break;
                    case EffectKind.Cleanse:
                        foreach (var target in targets)
                            target.RemoveDebuffs(effect.value >= 99 ? int.MaxValue : effect.value);
                        break;
                    case EffectKind.RageGain:
                        foreach (var target in targets)
                            GainRage(target, effect.value);
                        break;
                    case EffectKind.Shield:
                        foreach (var target in targets)
                        {
                            int pool = Math.Max(1, target.maxHp * effect.value / 100);
                            target.shield += pool;
                            target.AddBuff(new ActiveBuff
                            {
                                kind = EffectKind.Shield,
                                value = effect.value,
                                pool = pool,
                                sourceId = source.unitId,
                                appliedAt = _time,
                                expireAt = expire,
                                dispellable = false,
                            });
                            Emit(BattleEventKind.ShieldGained, source, target, skill.id, pool, target.hp, string.Empty);
                        }
                        break;
                    case EffectKind.Immunity:
                        foreach (var target in targets)
                        {
                            target.AddBuff(new ActiveBuff
                            {
                                kind = EffectKind.Immunity,
                                value = effect.value,
                                sourceId = source.unitId,
                                appliedAt = _time,
                                expireAt = -1,
                                pool = 1,
                                dispellable = false,
                            });
                        }
                        break;
                    default:
                        foreach (var target in targets)
                        {
                            if (!target.alive) continue;
                            // 条件技能的面板类效果在伤害结算时按目标判定（ConditionalSum），
                            // 这里不再挂成常驻 buff。
                            if (skill.condition != ConditionKind.None && IsConditionalCombatEffect(effect.kind)) continue;
                            target.AddBuff(new ActiveBuff
                            {
                                kind = effect.kind,
                                value = effect.value,
                                sourceId = source.unitId,
                                appliedAt = _time,
                                expireAt = expire,
                                debuff = IsDebuff(effect.kind),
                            });
                            Emit(BattleEventKind.BuffApplied, source, target, skill.id, effect.value, target.hp, effect.kind.ToString());
                        }
                        break;
                }
            }
        }

        private static bool IsConditionalCombatEffect(EffectKind kind)
        {
            return kind == EffectKind.DamageUp || kind == EffectKind.CritRate || kind == EffectKind.CritDmg;
        }

        private void TriggerAfterAction(BattleUnit actor)
        {
            var passive = _setup.Skill(actor.spec.passiveSkillId);
            if (passive != null && passive.trigger == TriggerKind.AfterAction)
            {
                if (_rng.Chance(passive.chance))
                    ApplyEffects(actor, passive, SelectTargets(actor, passive), permanent: false);
            }
        }

        private void TriggerOnHit(BattleUnit attacker, BattleUnit defender, int incomingDamage, bool allowAfterAttack)
        {
            if (defender == null || !defender.alive) return;
            var passive = _setup.Skill(defender.spec.passiveSkillId);
            if (passive != null && passive.trigger == TriggerKind.OnHit && _rng.Chance(passive.chance))
            {
                int reflect = Math.Max(1, incomingDamage * passive.EffectValue(EffectKind.Reflect) / 100);
                DealDamage(defender, attacker, reflect, direct: false, skillId: passive.id);
            }

            if (!allowAfterAttack) return;
            var after = _setup.Skill(attacker.spec.passiveSkillId);
            if (after != null && after.trigger == TriggerKind.AfterAttack)
            {
                var targets = SelectTargets(attacker, after);
                foreach (var t in targets)
                {
                    if (!t.alive) continue;
                    int dmg = ComputeDamage(attacker, t, after.power, after.defPenetration, after);
                    DealDamage(attacker, t, dmg, direct: true, skillId: after.id);
                }
            }
        }

        private static bool IsAllyTargeting(TargetRule rule)
        {
            return rule == TargetRule.Self
                || rule == TargetRule.LowestAlly
                || rule == TargetRule.AllAllies
                || rule == TargetRule.BackRowAllies;
        }

        private void HealTargets(BattleUnit source, SkillSpec skill, List<BattleUnit> targets)
        {
            int amount = source.Atk * skill.power / 100;
            amount += amount * source.HealUp / 100;

            foreach (var target in targets)
            {
                if (!target.alive) continue;
                int healed = Math.Min(target.maxHp - target.hp, Math.Max(0, amount));
                if (healed <= 0) continue;
                target.hp += healed;
                Emit(BattleEventKind.Heal, source, target, skill.id, healed, target.hp, string.Empty);
                TriggerOnHeal(source, target);
            }
        }

        /// <summary>潮汐祝福：每次治疗使目标获得 5% 减伤，最多 3 层。</summary>
        private void TriggerOnHeal(BattleUnit source, BattleUnit target)
        {
            var exclusive = _setup.Skill(source.spec.exclusiveSkillId);
            if (exclusive == null || exclusive.trigger != TriggerKind.OnHeal) return;

            int value = exclusive.EffectValue(EffectKind.DamageReduction);
            if (value <= 0) return;

            var existing = target.Find(EffectKind.DamageReduction);
            if (existing != null && existing.sourceId == source.unitId)
            {
                if (existing.stacks < 3) existing.stacks++;
                existing.appliedAt = _time;
                existing.expireAt = _time + 2 * RoundLength;
                return;
            }

            target.AddBuff(new ActiveBuff
            {
                kind = EffectKind.DamageReduction,
                value = value,
                sourceId = source.unitId,
                appliedAt = _time,
                expireAt = _time + 2 * RoundLength,
                stacks = 1,
                dispellable = false,
            });
        }

        private void GainRage(BattleUnit unit, int amount)
        {
            if (unit == null || !unit.alive) return;
            unit.rage = Math.Min(MaxRage, unit.rage + amount);
        }

        private int ComputeDamage(BattleUnit attacker, BattleUnit defender, int power, int defPenetration, SkillSpec skill)
        {
            int def = defender.Def;
            if (defPenetration > 0) def = def * (100 - Math.Min(100, defPenetration)) / 100;

            double baseDamage = attacker.Atk * (power / 100.0) * 100.0 / (100.0 + def);

            int damageUp = attacker.DamageUp + ConditionalSum(attacker, defender, EffectKind.DamageUp);
            int critRate = attacker.CritRate + ConditionalSum(attacker, defender, EffectKind.CritRate);
            int critDmg = attacker.CritDmg + ConditionalSum(attacker, defender, EffectKind.CritDmg);

            double damage = baseDamage * (1 + damageUp / 100.0);
            damage *= 1 - defender.DamageReduction / 100.0;

            bool crit = _rng.Chance(Math.Min(100, critRate));
            if (crit) damage *= critDmg / 100.0;

            int final = (int)Math.Floor(damage);
            int floorDamage = Math.Max(1, (int)Math.Floor(baseDamage * 0.05));
            return Math.Max(final, floorDamage);
        }

        /// <summary>
        /// 条件技能（如「对耐久 &gt;70% 的目标增伤」）在结算伤害时按目标判定；
        /// CSV 的 condition 是技能级的，因此整个技能的效果都按同一条件生效。
        /// </summary>
        private int ConditionalSum(BattleUnit attacker, BattleUnit defender, EffectKind kind)
        {
            int total = 0;
            total += ConditionalFromSkill(_setup.Skill(attacker.spec.passiveSkillId), defender, kind);
            total += ConditionalFromSkill(_setup.Skill(attacker.spec.exclusiveSkillId), defender, kind);
            return total;
        }

        private int ConditionalFromSkill(SkillSpec skill, BattleUnit defender, EffectKind kind)
        {
            if (skill == null || skill.condition == ConditionKind.None) return 0;
            float ratio = defender.HpRatio * 100f;
            bool match = skill.condition == ConditionKind.TargetHpAbove
                ? ratio > skill.conditionValue
                : ratio < skill.conditionValue;
            return match ? skill.EffectValue(kind) : 0;
        }

        private void DealDamage(BattleUnit source, BattleUnit target, int amount, bool direct, string skillId)
        {
            if (target == null || !target.alive) return;

            // 潮汐祝福的每场一次致命免疫。
            var immunity = target.Find(EffectKind.Immunity);
            if (immunity != null && target.hp - amount <= 0)
            {
                immunity.pool--;
                target.RemoveBuff(immunity);
                int heal = Math.Max(1, target.maxHp * immunity.value / 100);
                target.hp = Math.Min(target.maxHp, target.hp + heal);
                Emit(BattleEventKind.Heal, source, target, skillId, heal, target.hp, "immunity");
                return;
            }

            int remaining = amount;

            // 护盾优先吸收，且不受 DEF 影响。
            for (int i = target.buffs.Count - 1; i >= 0 && remaining > 0; i--)
            {
                var buff = target.buffs[i];
                if (buff.kind != EffectKind.Shield || buff.pool <= 0) continue;
                int absorb = Math.Min(buff.pool, remaining);
                buff.pool -= absorb;
                remaining -= absorb;
                if (buff.pool <= 0) target.RemoveBuff(buff);
            }
            target.shield = Math.Max(0, target.shield - (amount - remaining));

            if (remaining > 0)
            {
                target.hp -= remaining;
            }

            Emit(BattleEventKind.Damage, source, target, skillId, amount, Math.Max(0, target.hp), direct ? "direct" : "indirect");

            if (direct) GainRage(target, 10);

            if (target.hp <= 0 && target.alive)
            {
                target.hp = 0;
                target.alive = false;
                Emit(BattleEventKind.UnitDied, source, target, skillId, 0, 0, string.Empty);
                OnKill(source, target);
            }
        }

        private void OnKill(BattleUnit killer, BattleUnit victim)
        {
            if (killer == null) return;
            var exclusive = _setup.Skill(killer.spec.exclusiveSkillId);
            if (exclusive != null && exclusive.HasEffect(EffectKind.RageGain))
                GainRage(killer, exclusive.EffectValue(EffectKind.RageGain));
        }

        private List<BattleUnit> SelectTargets(BattleUnit actor, SkillSpec skill)
        {
            var result = new List<BattleUnit>();
            if (skill == null)
            {
                var enemy = ChooseSingleEnemy(actor);
                if (enemy != null) result.Add(enemy);
                return result;
            }

            var opponents = actor.IsAlly ? _enemies : _allies;
            var friends = actor.IsAlly ? _allies : _enemies;

            switch (skill.target)
            {
                case TargetRule.Self:
                    result.Add(actor);
                    break;
                case TargetRule.SingleEnemy:
                    var single = ChooseSingleEnemy(actor);
                    if (single != null) result.Add(single);
                    break;
                case TargetRule.HighestHpEnemy:
                    var highest = AliveMax(opponents, u => u.hp);
                    if (highest != null) result.Add(highest);
                    break;
                case TargetRule.RandomEnemy:
                    var random = AliveRandom(opponents, 1);
                    result.AddRange(random);
                    break;
                case TargetRule.RandomEnemy3:
                    result.AddRange(AliveRandom(opponents, 3));
                    break;
                case TargetRule.AllEnemies:
                    foreach (var u in opponents) if (u.alive) result.Add(u);
                    break;
                case TargetRule.LowestAlly:
                    var lowest = AliveMin(friends, u => u.HpRatio);
                    if (lowest != null) result.Add(lowest);
                    break;
                case TargetRule.AllAllies:
                    foreach (var u in friends) if (u.alive) result.Add(u);
                    break;
                case TargetRule.BackRowAllies:
                    foreach (var u in friends) if (u.alive && u.row == 1) result.Add(u);
                    break;
            }
            return result;
        }

        private BattleUnit ChooseSingleEnemy(BattleUnit actor)
        {
            var opponents = actor.IsAlly ? _enemies : _allies;

            // 嘲讽覆盖单体目标选择（设计文档 5.9）。
            BattleUnit taunter = null;
            ActiveBuff latest = null;
            foreach (var u in opponents)
            {
                if (!u.alive) continue;
                var buff = u.TauntBuff;
                if (buff == null) continue;
                if (latest == null || buff.appliedAt >= latest.appliedAt) { latest = buff; taunter = u; }
            }
            if (taunter != null) return taunter;

            BattleUnit best = null;
            double bestScore = double.MinValue;
            foreach (var u in opponents)
            {
                if (!u.alive) continue;
                double score = u.Atk * (1.0 + (1.0 - u.HpRatio));
                if (score > bestScore || (Math.Abs(score - bestScore) < 1e-9 && Before(u, best)))
                {
                    bestScore = score;
                    best = u;
                }
            }
            return best;
        }

        private List<BattleUnit> AliveRandom(List<BattleUnit> pool, int count)
        {
            var alive = new List<BattleUnit>();
            foreach (var u in pool) if (u.alive) alive.Add(u);

            var picked = new List<BattleUnit>();
            while (picked.Count < count && alive.Count > 0)
            {
                int index = _rng.NextInt(alive.Count);
                picked.Add(alive[index]);
                alive.RemoveAt(index);
            }
            return picked;
        }

        private static BattleUnit AliveMin(List<BattleUnit> pool, Func<BattleUnit, float> selector)
        {
            BattleUnit best = null;
            float bestValue = float.MaxValue;
            foreach (var u in pool)
            {
                if (!u.alive) continue;
                float value = selector(u);
                if (value < bestValue) { bestValue = value; best = u; }
            }
            return best;
        }

        private static BattleUnit AliveMax(List<BattleUnit> pool, Func<BattleUnit, int> selector)
        {
            BattleUnit best = null;
            int bestValue = int.MinValue;
            foreach (var u in pool)
            {
                if (!u.alive) continue;
                int value = selector(u);
                if (value > bestValue) { bestValue = value; best = u; }
            }
            return best;
        }

        private static bool Before(BattleUnit a, BattleUnit b)
        {
            if (b == null) return true;
            if (a.side != b.side) return a.side == BattleSide.Ally;
            return a.row < b.row || (a.row == b.row && a.slot < b.slot);
        }

        private BattleUnit FindAllyByConfig(string configId)
        {
            foreach (var u in _allies)
                if (u.spec.configId == configId) return u;
            return null;
        }

        private BattleUnit FindUnit(string unitId)
        {
            foreach (var u in _units)
                if (u.unitId == unitId) return u;
            return null;
        }

        private void ResetActionValue(BattleUnit unit)
        {
            if (!unit.alive) return;
            unit.actionValue = unit.Speed > 0 ? 10000.0 / unit.Speed : double.MaxValue;
        }

        private void ExpireBuffs()
        {
            foreach (var unit in _units)
            {
                if (!unit.alive) continue;
                for (int i = unit.buffs.Count - 1; i >= 0; i--)
                {
                    var buff = unit.buffs[i];
                    if (buff.expireAt < 0 || _time < buff.expireAt) continue;
                    unit.buffs.RemoveAt(i);
                    Emit(BattleEventKind.BuffExpired, unit, unit, string.Empty, 0, unit.hp, buff.kind.ToString());
                }
            }
        }

        private static bool HasAlive(List<BattleUnit> list)
        {
            foreach (var u in list) if (u.alive) return true;
            return false;
        }

        private static int CountDeaths(List<BattleUnit> list)
        {
            int count = 0;
            foreach (var u in list) if (!u.alive) count++;
            return count;
        }

        private static bool IsDebuff(EffectKind kind)
        {
            return kind == EffectKind.SpdDown || kind == EffectKind.Stun || kind == EffectKind.Dot || kind == EffectKind.Taunt;
        }

        private void End(bool victory, bool timeout)
        {
            _result.victory = victory;
            _result.timeout = timeout;
            Emit(BattleEventKind.BattleEnded, null, null, null, victory ? 1 : 0, 0, timeout ? "timeout" : string.Empty);
        }

        private void Emit(BattleEventKind kind, BattleUnit actor, BattleUnit target, string skillId, int value, int targetHp, string note)
        {
            _events.Add(new BattleEvent
            {
                kind = kind,
                round = _round,
                time = _time,
                actorId = actor != null ? actor.unitId : string.Empty,
                targetId = target != null ? target.unitId : string.Empty,
                skillId = skillId ?? string.Empty,
                value = value,
                targetHp = targetHp,
                note = note ?? string.Empty,
            });
        }
    }
}
