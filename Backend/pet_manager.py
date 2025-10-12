# backend/pet_manager.py

from datetime import datetime
import os
import json


class PetManager:
    def __init__(self):
        self.health = 100
        self.evolution_stage = 1  # 1=baby, 2=teen, 3=adult, 4=master
        self.points = 0
        self.good_behavior_streak = 0
        self.event_history = []
        self._load_state()

    def process_threat_event(self, severity: int, threat_type: str) -> dict:
        """Called when bad behavior detected"""
        print(f"\n💥 THREAT EVENT: {threat_type} (severity: {severity})")

        damage = severity / 5  # Scale 0-100 to 0-20
        old_health = self.health
        self.health = max(0, self.health - damage)

        print(
            f"   Health: {old_health:.1f} → {self.health:.1f} (-{damage:.1f})")

        self.good_behavior_streak = 0

        # Check devolution
        if self.health < 70 and self.evolution_stage > 1:
            old_stage = self.evolution_stage
            self.evolution_stage -= 1
            print(f"   😢 DEVOLVED: Stage {old_stage} → {self.evolution_stage}")

        # Log event
        self.event_history.append({
            "type": "threat",
            "threat_type": threat_type,
            "severity": severity,
            "damage": damage,
            "timestamp": datetime.now().isoformat()
        })

        self._save_state()
        return self.get_state()

    def process_good_behavior(self, time_safe: int) -> dict:
        """Called periodically when no threats detected"""
        self.good_behavior_streak += 1
        self.points += 10

        old_health = self.health
        self.health = min(100, self.health + 1)

        if self.good_behavior_streak % 10 == 0:
            print(
                f"\n✨ Good behavior: {self.good_behavior_streak} checks, {self.points} points")
            if old_health != self.health:
                print(f"   Health: {old_health:.1f} → {self.health:.1f} (+1)")

        # Check evolution
        if self.evolution_stage < 4:
            thresholds = {1: 500, 2: 1500, 3: 3000}
            next_threshold = thresholds.get(self.evolution_stage, 9999)

            if self.points >= next_threshold:
                old_stage = self.evolution_stage
                self.evolution_stage += 1
                print(
                    f"\n🎉 EVOLVED: Stage {old_stage} → {self.evolution_stage}!")

        if self.good_behavior_streak % 5 == 0:
            self._save_state()

        return self.get_state()

    def get_state(self) -> dict:
        """Returns current pet state for frontend"""
        return {
            "health": round(self.health, 1),
            "evolution_stage": self.evolution_stage,
            "points": self.points,
            "streak": self.good_behavior_streak,
            "state": self._calculate_mood()
        }

    def _calculate_mood(self) -> str:
        """happy, concerned, sick, critical"""
        if self.health > 80:
            return "happy"
        elif self.health > 50:
            return "concerned"
        elif self.health > 20:
            return "sick"
        else:
            return "critical"

    def _save_state(self):
        """Save pet state to file"""
        state = {
            "health": self.health,
            "evolution_stage": self.evolution_stage,
            "points": self.points,
            "streak": self.good_behavior_streak,
            "event_history": self.event_history[-50:]
        }
        with open('pet_state.json', 'w') as f:
            json.dump(state, f, indent=2)

    def _load_state(self):
        """Load pet state from file"""
        if os.path.exists('pet_state.json'):
            try:
                with open('pet_state.json', 'r') as f:
                    state = json.load(f)
                    self.health = state.get('health', 100)
                    self.evolution_stage = state.get('evolution_stage', 1)
                    self.points = state.get('points', 0)
                    self.good_behavior_streak = state.get('streak', 0)
                    self.event_history = state.get('event_history', [])
                    print("📂 Loaded previous pet state")
            except Exception as e:
                print(f"⚠️  Failed to load pet state: {e}")
