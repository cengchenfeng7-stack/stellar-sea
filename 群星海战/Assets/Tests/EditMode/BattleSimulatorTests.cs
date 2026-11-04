using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using StellarSea.Battle;

namespace StellarSea.Tests.EditMode
{
    public sealed class BattleSimulatorTests
    {
        private static UnitSpec Unit(
            BattleSide side,
            int hp = 1000,
            int atk = 100,
            int def = 0,
            int spd = 100,
            string configId = "u",
            string rageSkill = null,
            string passiveSkill = null,
            string exclusiveSkill = null)
        {
            return new UnitSpec
            {
                configId = configId,
                name = configId,
                side = side,
                hp = hp,
                atk = atk,
                def = def,
                spd = spd,
                critRate = 0,
                critDmg = 150,
                rageSkillId = rageSkill,
                passiveSkillId = passiveSkill,
                exclusiveSkillId = exclusiveSkill,
            };
        }

        private static SkillSpec Skill(string id, SkillKind kind, TargetRule target, int power, int duration = 0)
        {
            var skill = new SkillSpec
            {
                id = id,
                name = id,
                kind = kind,
                target = target,
                power = power,
                durationRounds = duration,
                chance = 100,
            };
            return skill;
        }

        private static BattleResult Run(BattleSetup setup) => new BattleSimulator(setup).Run();

        [Test]
        public void BasicAttack_UsesDamageFormula()
        {
            var setup = new BattleSetup { seed = "7", maxRounds = 30 };
            setup.allies.Add(Unit(BattleSide.Ally, hp: 1000, atk: 100, def: 0, spd: 100));
            setup.enemies.Add(Unit(BattleSide.Enemy, hp: 100000, atk: 0, def: 100, spd: 1));

            var result = Run(setup);
            var firstHit = result.events.First(e => e.kind == BattleEventKind.Damage);

            // 100 × 100/100 × 100/(100+100) = 50
            Assert.AreEqual(50, firstHit.value);
        }

        [Test]
        public void FasterUnit_ActsFirst()
        {
            var setup = new BattleSetup { seed = "1" };
            setup.allies.Add(Unit(BattleSide.Ally, spd: 200, configId: "fast"));
            setup.enemies.Add(Unit(BattleSide.Enemy, spd: 100, configId: "slow"));

            var result = Run(setup);
            var firstAction = result.events.First(e => e.kind == BattleEventKind.ActionStarted);
            Assert.AreEqual("A0", firstAction.actorId);
        }

        [Test]
        public void RageSkill_TriggersAfterFiveBasicAttacks()
        {
            var setup = new BattleSetup { seed = "1", maxRounds = 30 };
            var rage = Skill("rage", SkillKind.Rage, TargetRule.SingleEnemy, 200);
            setup.skills[rage.id] = rage;
            setup.allies.Add(Unit(BattleSide.Ally, hp: 100000, atk: 10, spd: 100, rageSkill: rage.id));
            setup.enemies.Add(Unit(BattleSide.Enemy, hp: 1000000, atk: 0, def: 0, spd: 1));

            var result = Run(setup);
            var firstSkill = result.events.FirstOrDefault(e => e.kind == BattleEventKind.SkillCast);

            Assert.IsNotNull(firstSkill);
            // 普攻 5 次（+20 怒气）后，第 6 次行动释放怒气技。
            int basicBefore = result.events
                .TakeWhile(e => e.kind != BattleEventKind.SkillCast)
                .Count(e => e.kind == BattleEventKind.BasicAttack);
            Assert.AreEqual(5, basicBefore);
        }

        [Test]
        public void SameSeed_ProducesIdenticalEvents()
        {
            BattleResult Once()
            {
                var setup = new BattleSetup { seed = "abc", maxRounds = 30 };
                setup.allies.Add(Unit(BattleSide.Ally, hp: 5000, atk: 120, def: 20, spd: 110, configId: "a"));
                setup.allies.Add(Unit(BattleSide.Ally, hp: 4000, atk: 150, def: 10, spd: 95, configId: "b"));
                setup.enemies.Add(Unit(BattleSide.Enemy, hp: 6000, atk: 90, def: 30, spd: 100, configId: "e"));
                return Run(setup);
            }

            var first = Once();
            var second = Once();

            Assert.AreEqual(first.events.Count, second.events.Count);
            Assert.AreEqual(first.victory, second.victory);
            for (int i = 0; i < first.events.Count; i++)
            {
                Assert.AreEqual(first.events[i].kind, second.events[i].kind, $"event {i}");
                Assert.AreEqual(first.events[i].value, second.events[i].value, $"event {i}");
            }
        }

        [Test]
        public void ThirtyRounds_TimeoutIsLoss()
        {
            var setup = new BattleSetup { seed = "1", maxRounds = 30 };
            setup.allies.Add(Unit(BattleSide.Ally, hp: 100000000, atk: 1, spd: 100));
            setup.enemies.Add(Unit(BattleSide.Enemy, hp: 100000000, atk: 0, spd: 100));

            var result = Run(setup);

            Assert.IsTrue(result.timeout);
            Assert.IsFalse(result.victory);
            Assert.LessOrEqual(result.rounds, 30);
        }

        [Test]
        public void Taunt_OverridesSingleTargetSelection()
        {
            var setup = new BattleSetup { seed = "1" };
            var taunt = Skill("taunt", SkillKind.Passive, TargetRule.Self, 0, duration: 99);
            taunt.trigger = TriggerKind.Always;
            taunt.effects.Add(new EffectSpec { kind = EffectKind.Taunt, value = 1 });
            setup.skills[taunt.id] = taunt;

            setup.allies.Add(Unit(BattleSide.Ally, hp: 100000, atk: 50, spd: 100, configId: "a"));
            setup.enemies.Add(Unit(BattleSide.Enemy, hp: 100000, atk: 0, def: 0, spd: 90, configId: "e0"));
            setup.enemies.Add(Unit(BattleSide.Enemy, hp: 100000, atk: 0, def: 0, spd: 80, configId: "e1", passiveSkill: taunt.id));

            var result = Run(setup);
            var firstAttack = result.events.First(e => e.kind == BattleEventKind.BasicAttack);
            Assert.AreEqual("E1", firstAttack.targetId);
        }

        [Test]
        public void BattleStartShield_AbsorbsDamageBeforeHp()
        {
            var setup = new BattleSetup { seed = "1" };
            var shield = new SkillSpec
            {
                id = "shield",
                kind = SkillKind.Exclusive,
                trigger = TriggerKind.BattleStart,
                target = TargetRule.Self,
            };
            shield.effects.Add(new EffectSpec { kind = EffectKind.Shield, value = 50 });
            setup.skills[shield.id] = shield;

            setup.allies.Add(Unit(BattleSide.Ally, hp: 1000, atk: 10, spd: 100, exclusiveSkill: shield.id));
            setup.enemies.Add(Unit(BattleSide.Enemy, hp: 100000, atk: 100, def: 0, spd: 200, configId: "e"));

            var result = Run(setup);
            var hit = result.events.First(e => e.kind == BattleEventKind.Damage && e.targetId == "A0");
            Assert.AreEqual(1000, hit.targetHp, "护盾应完全吸收第一击");
        }

        [Test]
        public void Combo_FiresOnceWhenBothShipsHaveFullRage()
        {
            var setup = new BattleSetup { seed = "1", maxRounds = 30 };
            var combo = new SkillSpec
            {
                id = "combo_skill",
                kind = SkillKind.Combo,
                target = TargetRule.AllEnemies,
                power = 120,
            };
            setup.skills[combo.id] = combo;
            setup.combos.Add(new ComboSpec
            {
                id = "c1",
                skillId = combo.id,
                shipA = "a",
                shipB = "b",
                priority = 1,
                oncePerBattle = true,
            });

            setup.allies.Add(Unit(BattleSide.Ally, hp: 100000, atk: 50, spd: 100, configId: "a"));
            setup.allies.Add(Unit(BattleSide.Ally, hp: 100000, atk: 50, spd: 100, configId: "b"));
            setup.enemies.Add(Unit(BattleSide.Enemy, hp: 1000000, atk: 0, spd: 50));

            var result = Run(setup);
            Assert.AreEqual(1, result.events.Count(e => e.kind == BattleEventKind.ComboCast));
        }

        [Test]
        public void Win_WhenAllEnemiesDie()
        {
            var setup = new BattleSetup { seed = "1" };
            setup.allies.Add(Unit(BattleSide.Ally, hp: 1000, atk: 500, spd: 100));
            setup.enemies.Add(Unit(BattleSide.Enemy, hp: 100, atk: 0, def: 0, spd: 1));

            var result = Run(setup);
            Assert.IsTrue(result.victory);
            Assert.IsFalse(result.timeout);
            Assert.AreEqual(1, result.enemyDeaths);
        }
    }
}
