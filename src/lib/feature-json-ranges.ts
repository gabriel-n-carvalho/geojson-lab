export type FeatureRange = {
  from: number
  to: number
  fromLine: number
  toLine: number
}

export function computeFeatureRanges(doc: string): FeatureRange[] {
  const ranges: FeatureRange[] = []
  const arrayStart = findTopLevelFeaturesArrayStart(doc)
  if (arrayStart < 0) return ranges

  let i = arrayStart
  while (i < doc.length) {
    const ch = doc[i]
    if (ch === ']') break
    if (ch === '{') {
      const end = skipBalancedObject(doc, i)
      if (end < 0) return ranges
      ranges.push({
        from: i,
        to: end + 1,
        fromLine: lineOf(doc, i),
        toLine: lineOf(doc, end),
      })
      i = end + 1
      continue
    }
    i++
  }
  return ranges
}

function findTopLevelFeaturesArrayStart(doc: string): number {
  let depth = 0
  let i = 0
  while (i < doc.length) {
    const ch = doc[i]
    if (ch === '"') {
      const keyEnd = skipString(doc, i)
      if (keyEnd < 0) return -1
      if (depth === 1 && doc.slice(i + 1, keyEnd) === 'features') {
        let k = keyEnd + 1
        while (k < doc.length && doc[k] !== '[') {
          if (
            doc[k] !== ' ' &&
            doc[k] !== '\t' &&
            doc[k] !== '\n' &&
            doc[k] !== '\r' &&
            doc[k] !== ':'
          ) {
            break
          }
          k++
        }
        if (doc[k] === '[') return k + 1
      }
      i = keyEnd + 1
      continue
    }
    if (ch === '{' || ch === '[') depth++
    else if (ch === '}' || ch === ']') depth--
    i++
  }
  return -1
}

function skipBalancedObject(doc: string, start: number): number {
  let depth = 0
  let i = start
  while (i < doc.length) {
    const ch = doc[i]
    if (ch === '"') {
      const end = skipString(doc, i)
      if (end < 0) return -1
      i = end + 1
      continue
    }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

function skipString(doc: string, start: number): number {
  let i = start + 1
  while (i < doc.length) {
    const ch = doc[i]
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === '"') return i
    i++
  }
  return -1
}

function lineOf(doc: string, idx: number): number {
  let line = 0
  const limit = Math.min(idx, doc.length)
  for (let i = 0; i < limit; i++) {
    if (doc[i] === '\n') line++
  }
  return line
}
