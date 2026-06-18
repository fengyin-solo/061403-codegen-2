import { ref, computed, onMounted, onUnmounted } from 'vue'

export const EXPLORE_ZONES = [
  {
    id: 'pine_forest',
    name: '松林',
    icon: '🌲',
    description: '茂密的针叶林，树木繁茂，野兽较少出没。',
    color: '#2d5a27',
    rewards: { wood: [4, 8], food: [0, 2], hide: [0, 1], tools: [0, 0] },
    baseRisk: 0.1,
    duration: 8000,
    unlockDay: 1
  },
  {
    id: 'ice_lake',
    name: '冰湖',
    icon: '❄️',
    description: '冰封的湖面，冰层下藏着肥美的鱼群。',
    color: '#4a90a4',
    rewards: { wood: [0, 1], food: [3, 6], hide: [1, 2], tools: [0, 0] },
    baseRisk: 0.18,
    duration: 10000,
    unlockDay: 1
  },
  {
    id: 'abandoned_mine',
    name: '废弃矿洞',
    icon: '⛏️',
    description: '前人遗落的矿洞，或许能找到有用的工具和木材。',
    color: '#6b4423',
    rewards: { wood: [1, 3], food: [0, 1], hide: [0, 1], tools: [1, 2] },
    baseRisk: 0.28,
    duration: 12000,
    unlockDay: 2
  },
  {
    id: 'deep_snow',
    name: '雪原深处',
    icon: '🐺',
    description: '一望无际的雪原，有珍贵的兽皮，也有凶猛的野兽。',
    color: '#8b7355',
    rewards: { wood: [0, 1], food: [2, 5], hide: [2, 4], tools: [0, 1] },
    baseRisk: 0.4,
    duration: 15000,
    unlockDay: 3
  },
  {
    id: 'frozen_ruins',
    name: '冰封遗迹',
    icon: '🏛️',
    description: '被冰雪掩埋的古老遗迹，危机四伏但资源丰厚。',
    color: '#4a4a8a',
    rewards: { wood: [2, 5], food: [2, 5], hide: [1, 3], tools: [1, 3] },
    baseRisk: 0.55,
    duration: 18000,
    unlockDay: 5
  }
]

export const EXPLORE_ROUTES = [
  {
    id: 'safe',
    name: '安全路线',
    icon: '🛤️',
    description: '绕远路避开危险，收益减少但更安全',
    timeMult: 1.2,
    riskMult: 0.5,
    rewardMult: 0.8,
    tempCost: 12
  },
  {
    id: 'normal',
    name: '常规路线',
    icon: '🚶',
    description: '标准行进路线，平衡收益与风险',
    timeMult: 1.0,
    riskMult: 1.0,
    rewardMult: 1.0,
    tempCost: 15
  },
  {
    id: 'shortcut',
    name: '捷径',
    icon: '⚡',
    description: '抄近道深入险境，时间短但风险极高',
    timeMult: 0.6,
    riskMult: 2.0,
    rewardMult: 1.3,
    tempCost: 20
  }
]

export function useGame() {
  const temperature = ref(80)
  const heat = ref(50)
  const wood = ref(10)
  const food = ref(5)
  const hide = ref(0)
  const tools = ref(0)
  const isDay = ref(true)
  const dayCount = ref(1)
  const isBlizzard = ref(false)
  const gameOver = ref(false)
  const gameOverReason = ref('')
  const actionLog = ref([])

  const isExploring = ref(false)
  const exploreTarget = ref(null)
  const exploreRoute = ref(null)
  const exploreProgress = ref(0)
  const exploreStartTime = ref(0)

  const DAY_DURATION = 30000
  const NIGHT_DURATION = 20000
  const HEAT_CONSUMPTION_RATE = 2
  const BLIZZARD_CHANCE = 0.15

  let dayNightTimer = null
  let nightConsumptionTimer = null
  let autoSaveTimer = null
  let exploreTimer = null

  const isNight = computed(() => !isDay.value)
  const isDanger = computed(() => temperature.value < 30)
  const canMakeFire = computed(() => wood.value >= 3)
  const canHunt = computed(() => tools.value > 0)
  const huntSuccessRate = computed(() => 0.3 + tools.value * 0.15)

  const availableZones = computed(() =>
    EXPLORE_ZONES.filter(z => dayCount.value >= z.unlockDay)
  )

  const canExplore = computed(() =>
    isDay.value && !isExploring.value && !gameOver.value && !isBlizzard.value
  )

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    actionLog.value.unshift({ message, type, timestamp })
    if (actionLog.value.length > 20) {
      actionLog.value.pop()
    }
  }

  function checkGameOver() {
    if (temperature.value <= 20) {
      gameOver.value = true
      gameOverReason.value = '体温过低，你在严寒中失去了意识...'
      if (exploreTimer) {
        clearInterval(exploreTimer)
        exploreTimer = null
      }
      isExploring.value = false
      exploreTarget.value = null
      exploreRoute.value = null
      exploreProgress.value = 0
      stopTimers()
      addLog('游戏结束：体温过低！', 'danger')
    }
    if (temperature.value >= 100) {
      temperature.value = 100
    }
  }

  function consumeHeat() {
    if (gameOver.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const consumption = HEAT_CONSUMPTION_RATE * multiplier
    
    if (heat.value >= consumption) {
      heat.value -= consumption
      if (temperature.value < 80) {
        temperature.value = Math.min(80, temperature.value + 1)
      }
    } else {
      heat.value = 0
      temperature.value = Math.max(0, temperature.value - consumption)
      addLog('热量不足！体温正在下降...', 'warning')
    }
    
    checkGameOver()
  }

  function startNightCycle() {
    addLog(`夜幕降临，第 ${dayCount.value} 天结束`, 'info')

    if (isExploring.value) {
      if (exploreTimer) {
        clearInterval(exploreTimer)
        exploreTimer = null
      }
      addLog('天黑了，探索队伍被迫撤回，未带回任何资源', 'warning')
      isExploring.value = false
      exploreTarget.value = null
      exploreRoute.value = null
      exploreProgress.value = 0
    }

    nightConsumptionTimer = setInterval(() => {
      consumeHeat()
    }, 1000)

    if (Math.random() < BLIZZARD_CHANCE) {
      triggerBlizzard()
    }
  }

  function startDayCycle() {
    dayCount.value++
    addLog(`天亮了，第 ${dayCount.value} 天开始`, 'success')
    isBlizzard.value = false
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
  }

  function toggleDayNight() {
    isDay.value = !isDay.value
    if (isDay.value) {
      startDayCycle()
    } else {
      startNightCycle()
    }
  }

  function triggerBlizzard() {
    isBlizzard.value = true
    addLog('⚠️ 暴风雪来袭！所有消耗加倍！', 'danger')
  }

  function chopWood() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 5 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    const woodGained = Math.floor(Math.random() * 3) + 2
    wood.value += woodGained
    
    addLog(`砍柴：获得 ${woodGained} 木头，消耗 ${tempCost} 体温`, 'action')
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function hunt() {
    if (gameOver.value || isNight.value) return
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 8 * multiplier
    
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    if (Math.random() < huntSuccessRate.value) {
      const foodGained = Math.floor(Math.random() * 3) + 2
      const hideGained = Math.floor(Math.random() * 2) + 1
      food.value += foodGained
      hide.value += hideGained
      addLog(`狩猎成功：获得 ${foodGained} 食物，${hideGained} 兽皮，消耗 ${tempCost} 体温`, 'success')
    } else {
      addLog(`狩猎失败：消耗 ${tempCost} 体温，空手而归`, 'warning')
    }
    
    if (Math.random() < BLIZZARD_CHANCE * 0.5) {
      triggerBlizzard()
    }
    
    checkGameOver()
  }

  function makeTools() {
    if (gameOver.value || isNight.value) return
    if (wood.value < 2 || hide.value < 1) {
      addLog('材料不足：需要 2 木头和 1 兽皮', 'warning')
      return
    }
    
    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = 6 * multiplier
    
    wood.value -= 2
    hide.value -= 1
    tools.value += 1
    temperature.value = Math.max(0, temperature.value - tempCost)
    
    addLog(`制作工具：获得 1 工具，消耗 ${tempCost} 体温`, 'success')
    checkGameOver()
  }

  function makeFire() {
    if (gameOver.value || !canMakeFire.value) {
      addLog('木头不足：生火需要 3 木头', 'warning')
      return
    }
    
    wood.value -= 3
    const heatGained = Math.floor(Math.random() * 20) + 25
    heat.value = Math.min(100, heat.value + heatGained)
    temperature.value = Math.min(100, temperature.value + 10)
    
    addLog(`生火：获得 ${heatGained} 热量，体温上升 10`, 'success')
  }

  function eatFood() {
    if (gameOver.value || food.value < 1) {
      addLog('没有食物了！', 'warning')
      return
    }
    
    food.value -= 1
    const tempGained = Math.floor(Math.random() * 10) + 5
    temperature.value = Math.min(100, temperature.value + tempGained)
    
    addLog(`进食：体温恢复 ${tempGained}`, 'success')
  }

  function startTimers() {
    dayNightTimer = setInterval(() => {
      toggleDayNight()
    }, isDay.value ? DAY_DURATION : NIGHT_DURATION)
    
    autoSaveTimer = setInterval(() => {
      saveGame('auto')
    }, 10000)
  }

  function stopTimers() {
    if (dayNightTimer) {
      clearInterval(dayNightTimer)
      dayNightTimer = null
    }
    if (nightConsumptionTimer) {
      clearInterval(nightConsumptionTimer)
      nightConsumptionTimer = null
    }
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
    }
    if (exploreTimer) {
      clearInterval(exploreTimer)
      exploreTimer = null
    }
  }

  function saveGame(slot = 'manual') {
    const gameState = {
      temperature: temperature.value,
      heat: heat.value,
      wood: wood.value,
      food: food.value,
      hide: hide.value,
      tools: tools.value,
      isDay: isDay.value,
      dayCount: dayCount.value,
      isBlizzard: isBlizzard.value,
      isExploring: isExploring.value,
      exploreTargetId: exploreTarget.value ? exploreTarget.value.id : null,
      exploreRouteId: exploreRoute.value ? exploreRoute.value.id : null,
      exploreProgress: exploreProgress.value,
      savedAt: Date.now()
    }
    localStorage.setItem(`snowSurvival_${slot}`, JSON.stringify(gameState))
    addLog(`游戏已保存到存档位：${slot === 'auto' ? '自动存档' : slot}`, 'info')
  }

  function loadGame(slot = 'auto') {
    const saved = localStorage.getItem(`snowSurvival_${slot}`)
    if (!saved) {
      addLog('没有找到存档', 'warning')
      return false
    }

    try {
      const gameState = JSON.parse(saved)
      temperature.value = gameState.temperature
      heat.value = gameState.heat
      wood.value = gameState.wood
      food.value = gameState.food
      hide.value = gameState.hide
      tools.value = gameState.tools
      isDay.value = gameState.isDay
      dayCount.value = gameState.dayCount
      isBlizzard.value = gameState.isBlizzard

      isExploring.value = false
      exploreTarget.value = null
      exploreRoute.value = null
      exploreProgress.value = 0

      gameOver.value = false
      gameOverReason.value = ''
      actionLog.value = []

      stopTimers()
      startTimers()

      if (!isDay.value) {
        startNightCycle()
      }

      addLog(`成功加载存档：${slot === 'auto' ? '自动存档' : slot}`, 'success')
      return true
    } catch (e) {
      addLog('存档损坏，无法加载', 'danger')
      return false
    }
  }

  function getSaveSlots() {
    const slots = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key.startsWith('snowSurvival_')) {
        const slotName = key.replace('snowSurvival_', '')
        try {
          const data = JSON.parse(localStorage.getItem(key))
          slots.push({
            name: slotName,
            dayCount: data.dayCount,
            savedAt: data.savedAt
          })
        } catch (e) {}
      }
    }
    return slots
  }

  function deleteSave(slot) {
    localStorage.removeItem(`snowSurvival_${slot}`)
    addLog(`已删除存档：${slot}`, 'info')
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  function startExplore(zoneId, routeId) {
    if (!canExplore.value) return false

    const zone = EXPLORE_ZONES.find(z => z.id === zoneId)
    const route = EXPLORE_ROUTES.find(r => r.id === routeId)
    if (!zone || !route) return false
    if (dayCount.value < zone.unlockDay) return false

    const multiplier = isBlizzard.value ? 2 : 1
    const tempCost = route.tempCost * multiplier
    if (temperature.value <= tempCost + 10) {
      addLog('体温过低，无法外出探索！', 'warning')
      return false
    }

    temperature.value = Math.max(0, temperature.value - tempCost)

    isExploring.value = true
    exploreTarget.value = zone
    exploreRoute.value = route
    exploreProgress.value = 0
    exploreStartTime.value = Date.now()

    const totalDuration = Math.round(zone.duration * route.timeMult)

    addLog(`出发探索【${zone.name}】，走${route.name}，消耗 ${tempCost} 体温`, 'action')

    if (exploreTimer) {
      clearInterval(exploreTimer)
      exploreTimer = null
    }

    exploreTimer = setInterval(() => {
      const elapsed = Date.now() - exploreStartTime.value
      const progress = Math.min(100, (elapsed / totalDuration) * 100)
      exploreProgress.value = progress

      if (progress >= 100) {
        clearInterval(exploreTimer)
        exploreTimer = null
        finishExplore()
      }
    }, 100)

    return true
  }

  function finishExplore() {
    const zone = exploreTarget.value
    const route = exploreRoute.value
    if (!zone || !route) return

    const finalRisk = zone.baseRisk * route.riskMult
    const riskRoll = Math.random()

    let riskEvent = null
    let tempLoss = 0
    let rewardMult = route.rewardMult

    if (riskRoll < finalRisk) {
      const riskLevel = Math.random()
      if (riskLevel < 0.4) {
        riskEvent = '遭遇野兽袭击'
        tempLoss = randInt(8, 18)
        rewardMult *= 0.7
        addLog(`⚠️ 探索中遭遇野兽袭击！额外损失 ${tempLoss} 体温`, 'warning')
      } else if (riskLevel < 0.75) {
        riskEvent = '遭遇暴风雪'
        tempLoss = randInt(5, 12)
        rewardMult *= 0.85
        if (!isBlizzard.value) {
          isBlizzard.value = true
        }
        addLog(`⚠️ 途中遭遇暴风雪！额外损失 ${tempLoss} 体温`, 'danger')
      } else {
        riskEvent = '迷失方向'
        tempLoss = randInt(10, 20)
        rewardMult *= 0.6
        addLog(`⚠️ 在雪原中迷失方向！额外损失 ${tempLoss} 体温`, 'warning')
      }
      temperature.value = Math.max(0, temperature.value - tempLoss)
    }

    const rewards = {}
    const rewardNames = { wood: '木头', food: '食物', hide: '兽皮', tools: '工具' }
    const rewardList = []
    for (const [key, range] of Object.entries(zone.rewards)) {
      const base = randInt(range[0], range[1])
      const amount = Math.max(0, Math.round(base * rewardMult))
      rewards[key] = amount
      if (amount > 0) {
        rewardList.push(`${amount} ${rewardNames[key]}`)
      }
      switch (key) {
        case 'wood': wood.value += amount; break
        case 'food': food.value += amount; break
        case 'hide': hide.value += amount; break
        case 'tools': tools.value += amount; break
      }
    }

    const riskSuffix = riskEvent ? `（经历：${riskEvent}）` : ''
    const rewardMsg = rewardList.length > 0 ? rewardList.join('、') : '空手而归'
    addLog(`从【${zone.name}】返回${riskSuffix}，带回：${rewardMsg}`, riskEvent ? 'warning' : 'success')

    if (Math.random() < BLIZZARD_CHANCE * 0.3 && !isBlizzard.value) {
      triggerBlizzard()
    }

    isExploring.value = false
    exploreTarget.value = null
    exploreRoute.value = null
    exploreProgress.value = 0

    checkGameOver()
  }

  function cancelExplore() {
    if (!isExploring.value) return
    if (exploreTimer) {
      clearInterval(exploreTimer)
      exploreTimer = null
    }
    addLog('紧急撤回探索队伍！所有已获取资源丢失', 'warning')
    isExploring.value = false
    exploreTarget.value = null
    exploreRoute.value = null
    exploreProgress.value = 0
  }

  function restartGame() {
    temperature.value = 80
    heat.value = 50
    wood.value = 10
    food.value = 5
    hide.value = 0
    tools.value = 0
    isDay.value = true
    dayCount.value = 1
    isBlizzard.value = false
    gameOver.value = false
    gameOverReason.value = ''
    actionLog.value = []

    isExploring.value = false
    exploreTarget.value = null
    exploreRoute.value = null
    exploreProgress.value = 0

    stopTimers()
    startTimers()

    addLog('新游戏开始！祝你好运！', 'success')
  }

  onMounted(() => {
    startTimers()
    addLog('欢迎来到雪地生存！白天收集资源，夜晚保持温暖。', 'info')
  })

  onUnmounted(() => {
    stopTimers()
  })

  return {
    temperature,
    heat,
    wood,
    food,
    hide,
    tools,
    isDay,
    isNight,
    dayCount,
    isBlizzard,
    gameOver,
    gameOverReason,
    actionLog,
    isDanger,
    canMakeFire,
    canHunt,
    huntSuccessRate,
    chopWood,
    hunt,
    makeTools,
    makeFire,
    eatFood,
    saveGame,
    loadGame,
    getSaveSlots,
    deleteSave,
    restartGame,
    availableZones,
    canExplore,
    isExploring,
    exploreTarget,
    exploreRoute,
    exploreProgress,
    startExplore,
    cancelExplore
  }
}
