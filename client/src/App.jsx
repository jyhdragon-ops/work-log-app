import { useState, useEffect } from 'react'

function today() {
  return new Date().toISOString().split('T')[0]
}

function thisMonthStart() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function calcTime(start, end) {
  if (!start || !end) return { hours: 0, minutes: 0 }
  const sp = start.split(':'), ep = end.split(':')
  if (sp.length < 2 || ep.length < 2) return { hours: 0, minutes: 0 }
  const [sh, sm] = sp.map(Number)
  const [eh, em] = ep.map(Number)
  if (isNaN(sh)||isNaN(sm)||isNaN(eh)||isNaN(em)) return { hours: 0, minutes: 0 }
  const total = (eh * 60 + em) - (sh * 60 + sm)
  if (total <= 0) return { hours: 0, minutes: 0 }
  return { hours: Math.floor(total / 60), minutes: total % 60 }
}

// 시간 자동 포맷: 숫자 4자리 입력시 자동으로 : 삽입
function formatTimeInput(val) {
  const digits = val.replace(/\D/g, '')
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + ':' + digits.slice(2, 4)
}

// ─── 일지 작성 ───────────────────────────────────────────
function FormPage({ workers, onSaved }) {
  const emptyForm = {
    date: today(), product_name: '', category: '', work_content: '',
    start_time: '', end_time: '', worker: [], lot_number: '',
    manufacture_date: '', notes: ''
  }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const time = calcTime(form.start_time, form.end_time)

  function setField(field, val) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function toggleWorker(name) {
    setForm(f => ({
      ...f,
      worker: f.worker.includes(name)
        ? f.worker.filter(w => w !== name)
        : [...f.worker, name]
    }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, worker: form.worker.join(', ') })
      })
      if (!res.ok) throw new Error()
      setMsg({ type: 'success', text: '저장되었습니다!' })
      setForm({ ...emptyForm, date: form.date })
      onSaved()
    } catch {
      setMsg({ type: 'error', text: '저장에 실패했습니다.' })
    }
    setSaving(false)
    setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="page">
      <h2 className="page-title">일지 작성</h2>
      {msg && <div className={`toast ${msg.type}`}>{msg.text}</div>}

      <form onSubmit={submit} className="form">
        <div className="field">
          <label>일자 <span className="req">*</span></label>
          <input type="date" value={form.date}
            onChange={e => setField('date', e.target.value)} required />
        </div>

        <div className="field">
          <label>품명</label>
          <input type="text" value={form.product_name}
            onChange={e => setField('product_name', e.target.value)}
            placeholder="품명을 입력하세요" />
        </div>

        <div className="field">
          <label>구분</label>
          <div className="chip-grid">
            {['생산','청소','문서','셋팅','칭량','입고','불출','반납','기타'].map(cat => (
              <button type="button" key={cat}
                className={`chip ${form.category === cat ? 'active' : ''}`}
                onClick={() => setField('category', form.category === cat ? '' : cat)}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>작업내용</label>
          <textarea value={form.work_content}
            onChange={e => setField('work_content', e.target.value)}
            placeholder="작업내용을 입력하세요" rows={3} />
        </div>

        <div className="field-row">
          <div className="field">
            <label>시작 시간</label>
            <input type="text" inputMode="numeric" value={form.start_time}
              onChange={e => setField('start_time', formatTimeInput(e.target.value))}
              placeholder="0900 → 09:00" maxLength={5} />
          </div>
          <div className="field">
            <label>종료 시간</label>
            <input type="text" inputMode="numeric" value={form.end_time}
              onChange={e => setField('end_time', formatTimeInput(e.target.value))}
              placeholder="1800 → 18:00" maxLength={5} />
          </div>
        </div>

        {form.start_time && form.end_time && (
          <div className="time-badge">
            총 사용시간: <strong>{time.hours}시간 {time.minutes}분</strong>
            <span className="time-sub"> ({time.hours * 60 + time.minutes}분)</span>
          </div>
        )}

        <div className="field">
          <label>작업자</label>
          {workers.length === 0
            ? <p className="hint">작업자 관리 탭에서 먼저 작업자를 추가하세요.</p>
            : (
              <div className="chip-grid">
                {workers.map(w => (
                  <button type="button" key={w.id}
                    className={`chip ${form.worker.includes(w.name) ? 'active' : ''}`}
                    onClick={() => toggleWorker(w.name)}>
                    {w.name}
                  </button>
                ))}
              </div>
            )
          }
        </div>

        <div className="field-row">
          <div className="field">
            <label>제조번호</label>
            <input type="text" value={form.lot_number}
              onChange={e => setField('lot_number', e.target.value)}
              placeholder="제조번호" />
          </div>
          <div className="field">
            <label>제조일자</label>
            <input type="date" value={form.manufacture_date}
              onChange={e => setField('manufacture_date', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>비고</label>
          <input type="text" value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="비고 입력" />
        </div>

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </div>
  )
}

// ─── 인라인 수정 행 ───────────────────────────────────────
function EditRow({ log, workers, onSave, onCancel }) {
  const [form, setForm] = useState({
    date: log.date || '',
    product_name: log.product_name || '',
    category: log.category || '',
    work_content: log.work_content || '',
    start_time: log.start_time || '',
    end_time: log.end_time || '',
    worker: log.worker || '',
    lot_number: log.lot_number || '',
    manufacture_date: log.manufacture_date || '',
    notes: log.notes || ''
  })

  const selectedWorkers = form.worker ? form.worker.split(', ').map(w => w.trim()).filter(Boolean) : []

  function toggleWorker(name) {
    const updated = selectedWorkers.includes(name)
      ? selectedWorkers.filter(w => w !== name)
      : [...selectedWorkers, name]
    setForm(p => ({ ...p, worker: updated.join(', ') }))
  }

  function set(f, v) { setForm(p => ({ ...p, [f]: v })) }

  async function save() {
    await fetch(`/api/logs/${log.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    onSave()
  }

  const t = calcTime(form.start_time, form.end_time)

  return (
    <tr className="edit-row">
      <td><input type="date" value={form.date} onChange={e => set('date', e.target.value)} /></td>
      <td><input value={form.product_name} onChange={e => set('product_name', e.target.value)} /></td>
      <td>
        <select value={form.category} onChange={e => set('category', e.target.value)}>
          <option value="">선택</option>
          {['생산','청소','문서','셋팅','칭량','입고','불출','반납','기타'].map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </td>
      <td><input value={form.work_content} onChange={e => set('work_content', e.target.value)} /></td>
      <td><input type="text" inputMode="numeric" placeholder="09:00" maxLength={5} value={form.start_time} onChange={e => set('start_time', e.target.value)} /></td>
      <td><input type="text" inputMode="numeric" placeholder="18:00" maxLength={5} value={form.end_time} onChange={e => set('end_time', e.target.value)} /></td>
      <td className="center">{t.hours}</td>
      <td className="center">{t.minutes}</td>
      <td>
        <div className="chip-grid">
          {workers.map(w => (
            <button type="button" key={w.id}
              className={`chip chip-sm ${selectedWorkers.includes(w.name) ? 'active' : ''}`}
              onClick={() => toggleWorker(w.name)}>
              {w.name}
            </button>
          ))}
        </div>
      </td>
      <td><input value={form.lot_number} onChange={e => set('lot_number', e.target.value)} /></td>
      <td><input type="date" value={form.manufacture_date} onChange={e => set('manufacture_date', e.target.value)} /></td>
      <td><input value={form.notes} onChange={e => set('notes', e.target.value)} /></td>
      <td>
        <button onClick={save} className="btn-sm btn-save">저장</button>
        <button onClick={onCancel} className="btn-sm btn-cancel">취소</button>
      </td>
    </tr>
  )
}

// ─── 일지 조회 ───────────────────────────────────────────
function ViewPage({ workers, refreshKey }) {
  const [logs, setLogs] = useState([])
  const [filter, setFilter] = useState({ date_from: today(), date_to: today(), worker: '' })
  const [loading, setLoading] = useState(false)
  const [editId, setEditId] = useState(null)

  async function load() {
    setLoading(true)
    const p = new URLSearchParams()
    if (filter.date_from) p.set('date_from', filter.date_from)
    if (filter.date_to)   p.set('date_to', filter.date_to)
    if (filter.worker)    p.set('worker', filter.worker)
    const res = await fetch(`/api/logs?${p}`)
    setLogs(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [refreshKey])

  function exportExcel() {
    const p = new URLSearchParams()
    if (filter.date_from) p.set('date_from', filter.date_from)
    if (filter.date_to)   p.set('date_to', filter.date_to)
    window.open(`/api/logs/export?${p}`)
  }

  async function deleteLog(id) {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    await fetch(`/api/logs/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="page page-view">
      <h2 className="page-title">일지 조회</h2>

      <div className="filter-bar">
        <input type="date" value={filter.date_from}
          onChange={e => setFilter(f => ({ ...f, date_from: e.target.value }))} />
        <span className="filter-sep">~</span>
        <input type="date" value={filter.date_to}
          onChange={e => setFilter(f => ({ ...f, date_to: e.target.value }))} />
        <select value={filter.worker}
          onChange={e => setFilter(f => ({ ...f, worker: e.target.value }))}>
          <option value="">전체 작업자</option>
          {workers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
        </select>
        <button onClick={load} className="btn-secondary">조회</button>
        <button onClick={exportExcel} className="btn-excel">Excel 다운로드</button>
      </div>

      {loading
        ? <div className="loading">불러오는 중...</div>
        : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>일자</th>
                  <th>품명</th>
                  <th>구분</th>
                  <th>작업내용</th>
                  <th>시작</th>
                  <th>종료</th>
                  <th>시간</th>
                  <th>분</th>
                  <th>작업자</th>
                  <th>제조번호</th>
                  <th>제조일자</th>
                  <th>비고</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 && (
                  <tr><td colSpan={13} className="empty-cell">조회된 데이터가 없습니다.</td></tr>
                )}
                {logs.map(log =>
                  editId === log.id
                    ? <EditRow key={log.id} log={log} workers={workers}
                        onSave={() => { setEditId(null); load() }}
                        onCancel={() => setEditId(null)} />
                    : (
                      <tr key={log.id}>
                        <td className="nowrap">{log.date}</td>
                        <td>{log.product_name}</td>
                        <td className="nowrap">{log.category}</td>
                        <td>{log.work_content}</td>
                        <td className="nowrap">{log.start_time}</td>
                        <td className="nowrap">{log.end_time}</td>
                        <td className="center">{log.total_hours}</td>
                        <td className="center">{log.total_minutes}</td>
                        <td className="nowrap">{log.worker}</td>
                        <td>{log.lot_number}</td>
                        <td className="nowrap">{log.manufacture_date}</td>
                        <td>{log.notes}</td>
                        <td className="action-cell">
                          <button onClick={() => setEditId(log.id)} className="btn-sm btn-edit">수정</button>
                          <button onClick={() => deleteLog(log.id)} className="btn-sm btn-delete">삭제</button>
                        </td>
                      </tr>
                    )
                )}
              </tbody>
            </table>
          </div>
        )
      }
      <div className="count-bar">총 {logs.length}건</div>
    </div>
  )
}

// ─── 작업자 관리 ─────────────────────────────────────────
function WorkersPage({ workers, onChanged }) {
  const [name, setName] = useState('')
  const [err, setErr] = useState('')

  async function add(e) {
    e.preventDefault()
    if (!name.trim()) return
    const res = await fetch('/api/workers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() })
    })
    const data = await res.json()
    if (data.error) { setErr(data.error); return }
    setName('')
    setErr('')
    onChanged()
  }

  async function del(id, workerName) {
    if (!confirm(`'${workerName}' 작업자를 삭제하시겠습니까?`)) return
    await fetch(`/api/workers/${id}`, { method: 'DELETE' })
    onChanged()
  }

  return (
    <div className="page">
      <h2 className="page-title">작업자 관리</h2>
      <p className="hint">일지 작성 시 선택할 작업자 목록을 관리합니다. (최대 20명)</p>

      <form onSubmit={add} className="add-worker-form">
        <input value={name} onChange={e => { setName(e.target.value); setErr('') }}
          placeholder="작업자 이름 입력" maxLength={20} />
        <button type="submit" className="btn-primary" disabled={workers.length >= 20}>추가</button>
      </form>
      {err && <div className="toast error">{err}</div>}

      <ul className="worker-list">
        {workers.length === 0 && <li className="empty-item">등록된 작업자가 없습니다.</li>}
        {workers.map((w, i) => (
          <li key={w.id}>
            <span className="worker-num">{i + 1}</span>
            <span className="worker-name">{w.name}</span>
            <button onClick={() => del(w.id, w.name)} className="btn-sm btn-delete">삭제</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── PIN 모달 ─────────────────────────────────────────────
function PinModal({ onSuccess, onClose }) {
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)

  function check() {
    if (pin === '1809') {
      onSuccess()
    } else {
      setErr(true)
      setPin('')
      setTimeout(() => setErr(false), 1500)
    }
  }

  return (
    <div className="pin-overlay" onClick={onClose}>
      <div className="pin-modal" onClick={e => e.stopPropagation()}>
        <h3>관리자 인증</h3>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && check()}
          placeholder="PIN 4자리 입력"
          autoFocus
          className={err ? 'pin-input error' : 'pin-input'}
        />
        {err && <p className="pin-err">비밀번호가 틀렸습니다.</p>}
        <div className="pin-btns">
          <button onClick={check} className="btn-primary">확인</button>
          <button onClick={onClose} className="btn-secondary">취소</button>
        </div>
      </div>
    </div>
  )
}

// ─── 앱 루트 ─────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('form')
  const [workers, setWorkers] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showPin, setShowPin] = useState(false)
  const [adminUnlocked, setAdminUnlocked] = useState(false)

  async function loadWorkers() {
    try {
      const res = await fetch('/api/workers')
      setWorkers(await res.json())
    } catch {
      // 서버 미연결 시 무시
    }
  }

  useEffect(() => { loadWorkers() }, [])

  function handleWorkersTab() {
    if (adminUnlocked) {
      setTab('workers')
    } else {
      setShowPin(true)
    }
  }

  const tabs = [
    { id: 'form',    label: '일지 작성' },
    { id: 'view',    label: '일지 조회' },
  ]

  return (
    <div className="app">
      <header className="app-header">
        <span className="header-icon">📋</span>
        <h1>작업 일지</h1>
      </header>

      <nav className="app-nav">
        {tabs.map(t => (
          <button key={t.id}
            className={`nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        <button
          className={`nav-btn ${tab === 'workers' ? 'active' : ''}`}
          onClick={handleWorkersTab}>
          작업자 관리
        </button>
      </nav>

      {showPin && (
        <PinModal
          onSuccess={() => { setAdminUnlocked(true); setShowPin(false); setTab('workers') }}
          onClose={() => setShowPin(false)}
        />
      )}

      <main className="app-main">
        {tab === 'form' && (
          <FormPage workers={workers} onSaved={() => setRefreshKey(k => k + 1)} />
        )}
        {tab === 'view' && (
          <ViewPage workers={workers} refreshKey={refreshKey} />
        )}
        {tab === 'workers' && adminUnlocked && (
          <WorkersPage workers={workers} onChanged={loadWorkers} />
        )}
      </main>
    </div>
  )
}
