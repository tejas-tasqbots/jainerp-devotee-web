import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import { api, apiError } from '../../lib/api'

/**
 * Deep-link target for a specific donation's receipt — this is the page a
 * WhatsApp "view your receipt" link / Download Receipt button points to.
 * Served WITHOUT login: the two UUIDs in the URL are the access key, and the
 * API keeps the PAN masked on this public path (full PAN needs the authed
 * in-app receipt view).
 */
export function ReceiptPage() {
  const { tenantId, donationId } = useParams()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // No PDF-generation library on this app (mandir-web has one, but it's a
  // separate frontend and can't be imported here) — the receipt HTML already
  // has print styling built in, so we hand it to the browser's own print/save
  // dialog, which can save as PDF everywhere.
  //
  // Desktop: printing the embedded iframe works reliably. Mobile browsers,
  // though, ignore programmatic print() on an iframe (that's why Download did
  // nothing on phones), so there we open the receipt as a standalone document
  // in a new tab where the native Share → Print / Save as PDF is available.
  function downloadReceipt() {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    if (isMobile && html) {
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) {
        // Trigger the OS print/share sheet once the standalone doc has painted.
        win.addEventListener('load', () => setTimeout(() => win.print(), 300))
      } else {
        // Popup blocked — navigate this tab to the raw receipt so the user can
        // still use the browser menu's Print / Share.
        window.location.href = url
      }
      // Revoke after a delay so the new tab has time to read the blob.
      setTimeout(() => URL.revokeObjectURL(url), 60000)
      return
    }
    const frame = iframeRef.current?.contentWindow
    if (frame) { frame.focus(); frame.print() }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError('')
      try {
        const { data } = await api.get<string>(`/public/receipts/${tenantId}/${donationId}`, { responseType: 'text' })
        if (!cancelled) setHtml(data)
      } catch (e) {
        if (!cancelled) setError(apiError(e) || 'Could not load receipt')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (tenantId && donationId) load()
    return () => { cancelled = true }
  }, [tenantId, donationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !html) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="page-header">
          <button onClick={() => navigate('/donations')} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="page-title">Receipt</h1>
        </div>
        <div className="mx-4 mt-6 card p-8 text-center">
          <FileText size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{error || 'Receipt not found'}</p>
        </div>
      </div>
    )
  }

  // The receipt endpoint returns a full standalone HTML document (styling included) —
  // render it directly rather than re-wrapping in this app's own layout/CSS.
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-header">
        <button onClick={() => navigate('/donations')} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="page-title">Receipt</h1>
        <button
          onClick={downloadReceipt}
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-blue-dark px-3 py-1.5"
        >
          <Download size={16} /> Download
        </button>
      </div>
      <iframe
        ref={iframeRef}
        title="Receipt"
        srcDoc={html}
        style={{ border: 'none', width: '100%', height: 'calc(100vh - 56px)' }}
      />
    </div>
  )
}
