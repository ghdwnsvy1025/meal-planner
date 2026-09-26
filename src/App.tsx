import { useState } from 'react'
import { TodayScreen } from './screens/TodayScreen'
import { GroupsScreen } from './screens/GroupsScreen'
import { FoodsScreen } from './screens/FoodsScreen'
import { StatsScreen } from './screens/StatsScreen'
import { SettingsSheet } from './screens/SettingsScreen'
import { IconFoods, IconGroups, IconStats, IconToday } from './components/icons'

type Tab = 'today' | 'groups' | 'foods' | 'stats'

const TABS: { id: Tab; label: string; icon: () => React.JSX.Element }[] = [
  { id: 'today', label: '오늘', icon: IconToday },
  { id: 'groups', label: '그룹', icon: IconGroups },
  { id: 'foods', label: '음식', icon: IconFoods },
  { id: 'stats', label: '통계', icon: IconStats },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <div className="app">
      {tab === 'today' && <TodayScreen onOpenSettings={() => setSettingsOpen(true)} />}
      {tab === 'groups' && <GroupsScreen />}
      {tab === 'foods' && <FoodsScreen />}
      {tab === 'stats' && <StatsScreen />}
      <nav className="tabbar" aria-label="주 메뉴">
        <div className="tabbar-inner">
          {TABS.map((t) => (
            <button key={t.id} className="tab" aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
              <t.icon />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
