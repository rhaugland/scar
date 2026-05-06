'use client'

type Tab = 'play' | 'collection' | 'battle'

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
  monsterCount: number
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'play', label: 'PLAY', icon: '⚔' },
  { key: 'collection', label: 'COLLECTION', icon: '★' },
  { key: 'battle', label: 'BATTLE', icon: '⚡' },
]

export function TabBar({ active, onChange, monsterCount }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 border-t border-white/10 backdrop-blur-sm">
      <div className="flex justify-center max-w-[700px] mx-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 px-2 transition-colors ${
              active === tab.key
                ? 'text-pink-400'
                : 'text-white/30 hover:text-white/50'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="font-mono text-[10px] tracking-wider">
              {tab.label}
              {tab.key === 'collection' && monsterCount > 0 ? ` (${monsterCount})` : ''}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
