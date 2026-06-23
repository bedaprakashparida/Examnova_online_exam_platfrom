import { useState, useMemo } from 'react'

const keyboardLayouts = {
  default: [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['{shift}', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '{bksp}']
  ],
  shift: [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['{shift}', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '{bksp}']
  ]
}

function shuffleArray(array) {
  const newArr = [...array]
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]]
  }
  return newArr
}

function generateShuffledLayouts() {
  const defaultKeys = keyboardLayouts.default.flat()
  const shiftKeys = keyboardLayouts.shift.flat()

  const pairs = []
  const structure = keyboardLayouts.default.map(row => row.map(k => {
    if (k.startsWith('{') && k.endsWith('}')) return k;
    return 'KEY';
  }))

  for (let i = 0; i < defaultKeys.length; i++) {
    if (!defaultKeys[i].startsWith('{')) {
      pairs.push({ d: defaultKeys[i], s: shiftKeys[i] })
    }
  }

  const shuffledPairs = shuffleArray(pairs)

  const newDefault = []
  const newShift = []
  let pairIdx = 0

  for (let r = 0; r < structure.length; r++) {
    const dRow = []
    const sRow = []
    for (let c = 0; c < structure[r].length; c++) {
      if (structure[r][c] === 'KEY') {
        dRow.push(shuffledPairs[pairIdx].d)
        sRow.push(shuffledPairs[pairIdx].s)
        pairIdx++
      } else {
        dRow.push(keyboardLayouts.default[r][c])
        sRow.push(keyboardLayouts.shift[r][c])
      }
    }
    newDefault.push(dRow)
    newShift.push(sRow)
  }

  return { default: newDefault, shift: newShift }
}

export default function VirtualKeyboard({ value, onChange, onClose }) {
  const [isShift, setIsShift] = useState(false)
  const layouts = useMemo(() => generateShuffledLayouts(), [])
  const layout = isShift ? layouts.shift : layouts.default

  const handleKeyPress = (key) => {
    if (key === '{bksp}') {
      onChange(value.slice(0, -1))
    } else if (key === '{shift}') {
      setIsShift(!isShift)
    } else {
      onChange(value + key)
    }
  }

  return (
    <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xl mt-2 select-none animate-slide-up">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Virtual Keyboard</span>
        <button 
          type="button" 
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          Close
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {layout.map((row, i) => (
          <div key={i} className="flex justify-center gap-1.5">
            {row.map((key) => {
              const isSpecial = key.startsWith('{') && key.endsWith('}')
              const label = isSpecial ? (key === '{shift}' ? '⇧' : '⌫') : key
              
              let btnClass = "h-10 min-w-[2.5rem] px-2 flex items-center justify-center rounded-lg font-medium text-sm transition-all active:scale-95 shadow-sm "
              
              if (key === '{bksp}') {
                btnClass += "bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white"
              } else if (key === '{shift}') {
                btnClass += `${isShift ? 'bg-violet-500 text-white shadow-violet-500/50' : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white'}`
              } else {
                btnClass += "bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-950 text-slate-800 dark:text-slate-200"
              }

              return (
                <button
                  key={key}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleKeyPress(key) }}
                  className={btnClass}
                >
                  {label}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
