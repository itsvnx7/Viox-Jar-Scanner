import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileArchive, AlertCircle, Loader2, FolderOpen } from 'lucide-react'
import { uploadMod } from '../api/client'

interface Props { onScanStarted: (scanId: string) => void }
const MAX_MB = 50

export default function FileUpload({ onScanStarted }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0]
    if (!file) return
    setError(null)
    if (!file.name.toLowerCase().endsWith('.jar')) { setError('Only .jar files are accepted.'); return }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`File exceeds the ${MAX_MB} MB limit.`); return }
    setUploading(true)
    try { const { scan_id } = await uploadMod(file); onScanStarted(scan_id) }
    catch (e: any) { setError(e?.response?.data?.detail ?? 'Upload failed. Please try again.') }
    finally { setUploading(false) }
  }, [onScanStarted])
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop, accept: { 'application/java-archive': ['.jar'] }, maxFiles: 1, disabled: uploading, noClick: true,
  })
  return <div className="file-upload-wrap">
    <div {...getRootProps()} className={`dropzone-viox ${isDragActive ? 'drag-active' : ''} ${uploading ? 'is-uploading' : ''}`}>
      <input {...getInputProps()} />
      {uploading ? <><Loader2 className="upload-big-icon spin"/><h3>Uploading your mod…</h3><p>Preparing static inspection</p></> : isDragActive ? <><FileArchive className="upload-big-icon"/><h3>Drop your mod to begin</h3><p>Release to upload the JAR file</p></> : <>
        <button className="choose-file-button" type="button" onClick={open}><FolderOpen size={20}/> Choose File</button>
        <p className="drop-hint">or drag and drop a .jar file anywhere in this area</p>
      </>}
    </div>
    {error && <div className="upload-error"><AlertCircle size={16}/>{error}</div>}
  </div>
}
