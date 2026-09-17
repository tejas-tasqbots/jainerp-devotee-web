import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Share2 } from 'lucide-react'
import { api, apiError } from '../../lib/api'

/**
 * Deep-link target for a specific donation's receipt — this is the page a
 * WhatsApp "view your receipt" link / Download Receipt button points to.
 * Served WITHOUT login: the two UUIDs in the URL are the access key, and the
 * API keeps the PAN masked on this public path (full PAN needs the authed
 * in-app receipt view).
 */
export function ReceiptPage() {
  const { t } = useTranslation()
  const { tenantId, donationId } = useParams()
  const navigate = useNavigate()
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [busy, setBusy] = useState<'' | 'download' | 'share'>('')
  const [actionError, setActionError] = useState('')

  // The receipt as a real PDF, rendered by devotee-api — the same file the
  // WhatsApp "Download receipt (PDF)" button opens. This page used to hand the
  // HTML to the browser's print dialog, which on phones meant "Download" did
  // nothing and "save as PDF" was three menus deep.
  async function fetchPdf(): Promise<File> {
    const { data, headers } = await api.get<Blob>(`/public/receipt-pdf/${tenantId}_${donationId}.pdf`, { responseType: 'blob' })
    const disposition = String(headers['content-disposition'] ?? '')
    const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'Receipt.pdf'
    return new File([data], name, { type: 'application/pdf' })
  }

  async function downloadReceipt() {
    setBusy('download'); setActionError('')
    try {
      const file = await fetchPdf()
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (e) {
      setActionError(apiError(e) || t('ui.receiptPdfFailed', { defaultValue: 'Could not prepare the PDF. Please try again.' }))
    } finally {
      setBusy('')
    }
  }

  /** Native share sheet (WhatsApp, email…) with the PDF itself; a download where files cannot be shared. */
  async function shareReceipt() {
    setBusy('share'); setActionError('')
    try {
      const file = await fetchPdf()
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: file.name.replace(/.pdf$/, '') }).catch((e: DOMException) => {
          if (e?.name !== 'AbortError') throw e
        })
      } else {
        setBusy('')
        await downloadReceipt()
      }
    } catch (e) {
      setActionError(apiError(e) || t('ui.receiptPdfFailed', { defaultValue: 'Could not prepare the PDF. Please try again.' }))
    } finally {
      setBusy('')
    }
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
          <h1 className="page-title">{t('ui.receipt')}</h1>
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
        <h1 className="page-title">{t('ui.receipt')}</h1>
        <div className="ml-auto flex items-center">
          <button
            onClick={shareReceipt}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-blue-dark px-3 py-1.5 disabled:opacity-50"
          >
            <Share2 size={16} />{t('ui.share', { defaultValue: 'Share' })}</button>
          <button
            onClick={downloadReceipt}
            disabled={!!busy}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-blue-dark px-3 py-1.5 disabled:opacity-50"
          >
            <Download size={16} />{busy === 'download' ? t('ui.preparingPdf', { defaultValue: 'Preparing…' }) : t('ui.downloadPdf', { defaultValue: 'PDF' })}</button>
        </div>
      </div>
      {actionError && <div className="mx-4 mt-2 text-sm text-red-600">{actionError}</div>}
      <iframe
        title={t('ui.receipt')}
        srcDoc={html}
        style={{ border: 'none', width: '100%', height: 'calc(100vh - 56px)' }}
      />
    </div>
  )
}
