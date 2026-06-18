<template>
  <div class="snow-map">
    <h3 class="panel-title">🗺️ 雪原探索地图</h3>

    <div v-if="isExploring" class="exploring-status">
      <div class="exploring-header">
        <span class="exploring-icon">{{ exploreTarget.icon }}</span>
        <div class="exploring-info">
          <span class="exploring-zone">正在探索【{{ exploreTarget.name }}】</span>
          <span class="exploring-route">{{ exploreRoute.icon }} {{ exploreRoute.name }}</span>
        </div>
        <button class="cancel-btn" @click="$emit('cancel')" title="紧急撤回">⛔</button>
      </div>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: exploreProgress + '%' }"></div>
        <span class="progress-text">{{ Math.round(exploreProgress) }}%</span>
      </div>
    </div>

    <div v-else class="map-content">
      <div class="zones-grid">
        <button
          v-for="zone in allZones"
          :key="zone.id"
          class="zone-card"
          :class="{
            locked: dayCount < zone.unlockDay,
            selected: selectedZone?.id === zone.id,
            disabled: !canExplore
          }"
          :style="{ '--zone-color': zone.color }"
          @click="selectZone(zone)"
        >
          <div class="zone-lock" v-if="dayCount < zone.unlockDay">
            🔒 第{{ zone.unlockDay }}天解锁
          </div>
          <span class="zone-icon">{{ zone.icon }}</span>
          <span class="zone-name">{{ zone.name }}</span>
          <div class="zone-risk">
            <span v-for="i in 5" :key="i" class="risk-star" :class="{ active: i <= Math.ceil(zone.baseRisk * 10) }">★</span>
          </div>
        </button>
      </div>

      <transition name="fade">
        <div v-if="selectedZone && !isExploring" class="zone-detail">
          <div class="detail-header">
            <span class="detail-icon">{{ selectedZone.icon }}</span>
            <div>
              <h4 class="detail-name">{{ selectedZone.name }}</h4>
              <p class="detail-desc">{{ selectedZone.description }}</p>
            </div>
          </div>

          <div class="detail-info">
            <div class="info-block">
              <span class="info-label">预计产出</span>
              <div class="rewards-list">
                <span v-if="selectedZone.rewards.wood[1] > 0" class="reward-tag">🪵 {{ selectedZone.rewards.wood[0] }}-{{ selectedZone.rewards.wood[1] }}</span>
                <span v-if="selectedZone.rewards.food[1] > 0" class="reward-tag">🍖 {{ selectedZone.rewards.food[0] }}-{{ selectedZone.rewards.food[1] }}</span>
                <span v-if="selectedZone.rewards.hide[1] > 0" class="reward-tag">🦊 {{ selectedZone.rewards.hide[0] }}-{{ selectedZone.rewards.hide[1] }}</span>
                <span v-if="selectedZone.rewards.tools[1] > 0" class="reward-tag">🔪 {{ selectedZone.rewards.tools[0] }}-{{ selectedZone.rewards.tools[1] }}</span>
              </div>
            </div>
            <div class="info-block">
              <span class="info-label">基础风险</span>
              <span class="risk-value">{{ Math.round(selectedZone.baseRisk * 100) }}%</span>
            </div>
            <div class="info-block">
              <span class="info-label">基础耗时</span>
              <span class="time-value">{{ (selectedZone.duration / 1000).toFixed(0) }}秒</span>
            </div>
          </div>

          <div class="routes-section">
            <span class="section-label">选择路线</span>
            <div class="routes-grid">
              <button
                v-for="route in routes"
                :key="route.id"
                class="route-card"
                :class="{ selected: selectedRoute?.id === route.id }"
                @click="selectedRoute = route"
              >
                <span class="route-icon">{{ route.icon }}</span>
                <span class="route-name">{{ route.name }}</span>
                <span class="route-desc">{{ route.description }}</span>
                <div class="route-stats">
                  <span class="stat" :class="{ positive: route.rewardMult > 1, negative: route.rewardMult < 1 }">
                    收益×{{ route.rewardMult }}
                  </span>
                  <span class="stat" :class="{ positive: route.riskMult < 1, negative: route.riskMult > 1 }">
                    风险×{{ route.riskMult }}
                  </span>
                  <span class="stat temp-cost">-{{ route.tempCost }}体温</span>
                </div>
              </button>
            </div>
          </div>

          <button
            class="explore-btn"
            :class="{ disabled: !selectedRoute || !canExplore || isBlizzard }"
            :disabled="!selectedRoute || !canExplore || isBlizzard"
            @click="handleExplore"
          >
            {{ isBlizzard ? '⚠️ 暴风雪中无法出发' : canExplore ? '🚀 出发探索' : isNight ? '🌙 夜晚无法探索' : '请等待...' }}
          </button>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { EXPLORE_ZONES, EXPLORE_ROUTES } from '../composables/useGame'

const props = defineProps({
  isDay: { type: Boolean, default: true },
  isNight: { type: Boolean, default: false },
  isBlizzard: { type: Boolean, default: false },
  dayCount: { type: Number, default: 1 },
  canExplore: { type: Boolean, default: false },
  isExploring: { type: Boolean, default: false },
  exploreTarget: { type: Object, default: null },
  exploreRoute: { type: Object, default: null },
  exploreProgress: { type: Number, default: 0 }
})

const emit = defineEmits(['explore', 'cancel'])

const allZones = EXPLORE_ZONES
const routes = EXPLORE_ROUTES

const selectedZone = ref(null)
const selectedRoute = ref(null)

watch(() => props.dayCount, () => {
  if (selectedZone.value && props.dayCount < selectedZone.value.unlockDay) {
    selectedZone.value = null
    selectedRoute.value = null
  }
})

function selectZone(zone) {
  if (props.dayCount < zone.unlockDay) return
  if (!props.canExplore) return
  selectedZone.value = zone
  selectedRoute.value = null
}

function handleExplore() {
  if (!selectedZone.value || !selectedRoute.value) return
  emit('explore', selectedZone.value.id, selectedRoute.value.id)
  selectedZone.value = null
  selectedRoute.value = null
}
</script>

<style scoped>
.snow-map {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.snow-map::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    radial-gradient(circle at 30% 70%, rgba(255,255,255,0.05) 0%, transparent 40%),
    radial-gradient(circle at 70% 30%, rgba(100,150,200,0.08) 0%, transparent 40%);
  pointer-events: none;
}

.panel-title {
  color: white;
  font-size: 18px;
  margin-bottom: 15px;
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  position: relative;
}

.exploring-status {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 15px;
  border: 2px solid rgba(100, 200, 255, 0.4);
}

.exploring-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.exploring-icon {
  font-size: 36px;
  animation: bounce 0.8s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.exploring-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.exploring-zone {
  color: white;
  font-weight: bold;
  font-size: 16px;
}

.exploring-route {
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
}

.cancel-btn {
  background: rgba(231, 76, 60, 0.3);
  border: 2px solid rgba(231, 76, 60, 0.6);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: rgba(231, 76, 60, 0.5);
  transform: scale(1.05);
}

.progress-container {
  position: relative;
  height: 20px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  border-radius: 10px;
  transition: width 0.1s linear;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
}

.zones-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.zone-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 6px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.03));
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  font-family: inherit;
}

.zone-card::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--zone-color, #888);
  opacity: 0.8;
}

.zone-card:hover:not(.locked):not(.disabled) {
  transform: translateY(-4px);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.25), rgba(255, 255, 255, 0.05));
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  border-color: var(--zone-color, #fff);
}

.zone-card.selected {
  border-color: var(--zone-color, #fff);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.08));
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 20px rgba(255, 255, 255, 0.1);
}

.zone-card.locked {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.zone-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zone-lock {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #ffcc00;
  font-weight: bold;
  z-index: 2;
  border-radius: 10px;
}

.zone-icon {
  font-size: 28px;
}

.zone-name {
  color: white;
  font-size: 13px;
  font-weight: bold;
}

.zone-risk {
  display: flex;
  gap: 1px;
}

.risk-star {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.2);
}

.risk-star.active {
  color: #e74c3c;
  text-shadow: 0 0 4px rgba(231, 76, 60, 0.5);
}

.zone-detail {
  background: rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  padding: 15px;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-icon {
  font-size: 42px;
}

.detail-name {
  color: white;
  font-size: 18px;
  margin: 0 0 4px 0;
}

.detail-desc {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin: 0;
  line-height: 1.4;
}

.detail-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.info-block {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.info-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.rewards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}

.reward-tag {
  background: rgba(52, 152, 219, 0.3);
  border: 1px solid rgba(52, 152, 219, 0.5);
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 11px;
  color: white;
}

.risk-value {
  font-size: 16px;
  font-weight: bold;
  color: #e74c3c;
}

.time-value {
  font-size: 16px;
  font-weight: bold;
  color: #3498db;
}

.routes-section {
  margin-bottom: 15px;
}

.section-label {
  display: block;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 8px;
}

.routes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.route-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.route-card:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.35);
}

.route-card.selected {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.25);
  box-shadow: 0 0 15px rgba(52, 152, 219, 0.3);
}

.route-icon {
  font-size: 22px;
}

.route-name {
  color: white;
  font-size: 13px;
  font-weight: bold;
}

.route-desc {
  color: rgba(255, 255, 255, 0.6);
  font-size: 10px;
  text-align: center;
  line-height: 1.3;
}

.route-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  width: 100%;
}

.stat {
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  text-align: center;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.8);
}

.stat.positive {
  color: #2ecc71;
}

.stat.negative {
  color: #e74c3c;
}

.stat.temp-cost {
  color: #ff9500;
}

.explore-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.explore-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(46, 204, 113, 0.4);
}

.explore-btn:active:not(.disabled) {
  transform: translateY(0);
}

.explore-btn.disabled {
  background: linear-gradient(135deg, #555, #333);
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .zones-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .routes-grid {
    grid-template-columns: 1fr;
  }
  .detail-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 500px) {
  .zones-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
