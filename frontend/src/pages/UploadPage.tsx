import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import DropPortal3D from '@/3d/DropPortal3D'
import { GlassCard } from '@/components/common/GlassCard'
import { NeonButton } from '@/components/common/NeonButton'
import { SkeletonLoader } from '@/components/common/SkeletonLoader'
import { useUpload } from '@/hooks/useUpload'
import { useProjectStore } from '@/store/projectStore'
import { startScan } from '@/api/projects'
import { TreeNode } from '@/types'

export default function UploadPage() {
  const navigate = useNavigate()
  const { uploadFile, isUploading, progress } = useUpload()
  const currentProject = useProjectStore((s) => s.currentProject)
  const currentTree = useProjectStore((s) => s.currentTree)
  const setCurrentScan = useProjectStore((s) => s.setCurrentScan)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isStartingScan, setIsStartingScan] = useState(false)

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['zip', 'py', 'java'].includes(ext || '')) {
      toast.error('Unsupported file format. Please upload a .py, .java or .zip archive.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds the 50MB security threshold.')
      return
    }
    setSelectedFile(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/zip': ['.zip'],
      'text/x-python': ['.py'],
      'text/x-java-source': ['.java'],
    },
  })

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return
    try {
      await uploadFile(selectedFile)
      toast.success('Workspace securely extracted & analyzed.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to analyze project archive.')
    }
  }

  const handleStartScan = async () => {
    if (!currentProject) return
    setIsStartingScan(true)
    try {
      const scan = await startScan(currentProject.id)
      setCurrentScan(scan)
      navigate('/scan')
    } catch (err) {
      console.error(err)
      toast.error('Failed to initialize scan pipeline.')
    } finally {
      setIsStartingScan(false)
    }
  }

  const renderTreeNodes = (nodes: TreeNode[], depth = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: `${depth * 16}px` }} className="py-1">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-text-muted">{node.type === 'dir' ? '📁' : '📄'}</span>
          <span className={node.type === 'dir' ? 'text-text-primary font-bold' : 'text-text-secondary'}>
            {node.path.split('/').pop()}
          </span>
          {node.size_bytes !== undefined && (
            <span className="text-[10px] text-text-muted">({node.size_bytes} B)</span>
          )}
        </div>
        {node.children && renderTreeNodes(node.children, depth + 1)}
      </div>
    ))
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gradient-cyan-violet font-mono uppercase tracking-wide">
          Step 1: Ingestion & Workspace Analysis
        </h1>
        <p className="text-xs text-text-secondary font-mono mt-1">
          Zip-slip protected • Symlink stripped • Quota enforced (50MB / 500 files max)
        </p>
      </div>

      {/* Upload Drop Zone */}
      <GlassCard className="p-6 space-y-6" glowColor="cyan">
        <div {...getRootProps()} className="cursor-pointer">
          <input {...getInputProps()} />
          <DropPortal3D isActive={isDragActive} />
        </div>

        {selectedFile && (
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-glass bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-sm font-semibold text-white font-mono">{selectedFile.name}</p>
                <p className="text-xs text-text-muted font-mono">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Ready for extraction
                </p>
              </div>
            </div>

            <NeonButton
              variant="cyan"
              loading={isUploading}
              onClick={handleUploadAndAnalyze}
            >
              Analyze Project Workspace
            </NeonButton>
          </div>
        )}

        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono text-cyan">
              <span>Extracting and checking file bounds...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
              <div
                className="h-full bg-cyan transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </GlassCard>

      {/* Analysis Output Results */}
      {isUploading ? (
        <SkeletonLoader variant="tree" />
      ) : currentTree ? (
        <GlassCard className="p-6 space-y-6" glowColor="violet">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <h2 className="text-lg font-bold text-white font-mono">Analysis Report</h2>
              <p className="text-xs text-text-muted font-mono flex items-center gap-2 mt-0.5">
                <span>Source Files: <strong className="text-white">{currentTree.source_file_count}</strong></span>
                <span>•</span>
                <span>
                  Language:{' '}
                  <span className="text-cyan font-bold uppercase">{currentTree.language}</span>
                </span>
                {currentTree.language_confidence !== undefined && (
                  <span className="px-2 py-0.5 rounded bg-violet/20 border border-violet/40 text-[10px] text-violet font-bold font-mono">
                    {Math.round(currentTree.language_confidence * 100)}% confidence
                  </span>
                )}
              </p>
            </div>

            <NeonButton
              variant="violet"
              loading={isStartingScan}
              onClick={handleStartScan}
            >
              Launch Bug Detection Pipeline →
            </NeonButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Folder Tree */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted">
                Sanitized Project Tree
              </h3>
              <div className="p-4 rounded-glass bg-black/40 border border-white/[0.06] max-h-64 overflow-y-auto">
                {renderTreeNodes(currentTree.tree)}
              </div>
            </div>

            {/* Right: Metadata inspection */}
            <div className="space-y-4">
              {/* Language Detection Rationale */}
              {currentTree.language_reasons && currentTree.language_reasons.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2 flex items-center justify-between">
                    <span>Detection Rationale</span>
                    {currentTree.language_confidence !== undefined && (
                      <span className="text-cyan text-[10px] font-normal lowercase">
                        {Math.round(currentTree.language_confidence * 100)}% confidence
                      </span>
                    )}
                  </h3>
                  <div className="space-y-1.5 p-3 rounded bg-black/40 border border-white/[0.06]">
                    {currentTree.language_reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-mono text-text-muted">
                        <span className="text-cyan text-sm leading-none mt-0.5">▸</span>
                        <span className="text-slate-300">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                  Entry Point
                </h3>
                <div className="p-2.5 rounded bg-black/40 border border-cyan/20 text-xs font-mono text-cyan">
                  {currentTree.entry_point || 'None detected'}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                  Discovered Tests
                </h3>
                <div className="space-y-1">
                  {currentTree.test_files.length > 0 ? (
                    currentTree.test_files.map((tf) => (
                      <div
                        key={tf}
                        className="p-2 rounded bg-white/[0.02] border border-white/[0.04] text-xs font-mono text-emerald-400 flex items-center gap-2"
                      >
                        <span>✓</span>
                        <span>{tf}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-amber-400 font-mono">No tests discovered</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-text-muted mb-2">
                  Declared Dependencies
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {currentTree.dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono text-text-secondary"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      ) : null}
    </div>
  )
}
