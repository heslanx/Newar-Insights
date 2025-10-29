'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { api, type Recording, type CreateBotRequest } from '@/lib/api'
import { Play, Square, Download, Trash2, Loader2, RefreshCw, Volume2, Filter } from 'lucide-react'

export default function Dashboard() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [formData, setFormData] = useState<CreateBotRequest>({
    platform: 'google_meet',
    native_meeting_id: '',
    bot_name: 'Vexa Bot',
  })
  const [activeRecording, setActiveRecording] = useState<{
    platform: string
    meetingId: string
  } | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioBlobUrls, setAudioBlobUrls] = useState<Record<string, string>>({})

  // Filters
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadRecordings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [recordings, filterPlatform, filterStatus])

  const loadRecordings = async () => {
    try {
      const data = await api.listRecordings()
      setRecordings(data.recordings)
    } catch (error) {
      console.error('Error loading recordings:', error)
      alert('Erro ao carregar gravações. Verifique se a API está rodando.')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadRecordings()
    setRefreshing(false)
  }

  const applyFilters = () => {
    let filtered = [...recordings]

    if (filterPlatform !== 'all') {
      filtered = filtered.filter(r => r.platform === filterPlatform)
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.meeting_status === filterStatus)
    }

    setFilteredRecordings(filtered)
  }

  const handleStartRecording = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const meeting = await api.createBot(formData)
      setActiveRecording({
        platform: meeting.platform,
        meetingId: meeting.native_meeting_id,
      })
      alert(`Bot iniciado! ID: ${meeting.id}`)
      await loadRecordings()
    } catch (error: any) {
      alert(`Erro: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStopRecording = async () => {
    if (!activeRecording) return
    setLoading(true)

    try {
      await api.stopBot(activeRecording.platform, activeRecording.meetingId)
      setActiveRecording(null)
      alert('Gravação parada!')
      await loadRecordings()
    } catch (error: any) {
      alert(`Erro: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (platform: string, meetingId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta gravação?')) return

    try {
      await api.deleteRecording(platform, meetingId)
      alert('Gravação deletada!')
      await loadRecordings()
    } catch (error: any) {
      alert(`Erro: ${error.message}`)
    }
  }

  const handleDownload = async (platform: string, meetingId: string, filename: string) => {
    try {
      const url = api.getRecordingUrl(platform, meetingId)
      const response = await fetch(url, {
        headers: api.getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error('Erro ao baixar arquivo')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error: any) {
      alert(`Erro ao baixar: ${error.message}`)
    }
  }

  const toggleAudioPlayer = async (recordingKey: string, platform: string, meetingId: string) => {
    if (playingAudio === recordingKey) {
      setPlayingAudio(null)
    } else {
      // Check if we already have a blob URL for this recording
      if (!audioBlobUrls[recordingKey]) {
        try {
          const url = api.getRecordingUrl(platform, meetingId)
          const response = await fetch(url, {
            headers: api.getAuthHeaders(),
          })

          if (!response.ok) {
            throw new Error('Erro ao carregar áudio')
          }

          const blob = await response.blob()
          const blobUrl = window.URL.createObjectURL(blob)

          setAudioBlobUrls(prev => ({ ...prev, [recordingKey]: blobUrl }))
        } catch (error: any) {
          alert(`Erro ao carregar áudio: ${error.message}`)
          return
        }
      }

      setPlayingAudio(recordingKey)
    }
  }

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(audioBlobUrls).forEach(url => {
        window.URL.revokeObjectURL(url)
      })
    }
  }, [audioBlobUrls])

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      requested: 'secondary',
      joining: 'secondary',
      awaiting_admission: 'secondary',
      active: 'default',
      completed: 'outline',
      failed: 'destructive',
    }
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>
  }

  const uniqueStatuses = Array.from(new Set(recordings.map(r => r.meeting_status)))

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="container mx-auto p-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
            Vexa Recording System
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Grave reuniões do Google Meet e Microsoft Teams automaticamente
          </p>
        </div>

        {/* Recording Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Nova Gravação</CardTitle>
            <CardDescription>
              Inicie um bot para gravar uma reunião online
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStartRecording} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="platform">Plataforma</Label>
                  <select
                    id="platform"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={formData.platform}
                    onChange={(e) =>
                      setFormData({ ...formData, platform: e.target.value as any })
                    }
                  >
                    <option value="google_meet">Google Meet</option>
                    <option value="teams">Microsoft Teams</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meetingId">ID da Reunião</Label>
                  <Input
                    id="meetingId"
                    placeholder="abc-defg-hij ou 123456789"
                    value={formData.native_meeting_id}
                    onChange={(e) =>
                      setFormData({ ...formData, native_meeting_id: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="botName">Nome do Bot</Label>
                  <Input
                    id="botName"
                    placeholder="Vexa Bot"
                    value={formData.bot_name}
                    onChange={(e) =>
                      setFormData({ ...formData, bot_name: e.target.value })
                    }
                  />
                </div>

                {formData.platform === 'teams' && (
                  <div className="space-y-2">
                    <Label htmlFor="passcode">Passcode (Teams)</Label>
                    <Input
                      id="passcode"
                      placeholder="Opcional"
                      value={formData.passcode || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, passcode: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading || !!activeRecording}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Iniciar Gravação
                    </>
                  )}
                </Button>

                {activeRecording && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleStopRecording}
                    disabled={loading}
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Parar Gravação
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recordings Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gravações</CardTitle>
                <CardDescription>
                  {filteredRecordings.length} gravação(ões) encontrada(s)
                  {(filterPlatform !== 'all' || filterStatus !== 'all') &&
                    ` (${recordings.length} total)`}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="filterPlatform">Plataforma</Label>
                    <select
                      id="filterPlatform"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                      value={filterPlatform}
                      onChange={(e) => setFilterPlatform(e.target.value)}
                    >
                      <option value="all">Todas</option>
                      <option value="google_meet">Google Meet</option>
                      <option value="teams">Microsoft Teams</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="filterStatus">Status</Label>
                    <select
                      id="filterStatus"
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      {uniqueStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setFilterPlatform('all')
                    setFilterStatus('all')
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>ID da Reunião</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecordings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500">
                      {recordings.length === 0
                        ? 'Nenhuma gravação encontrada'
                        : 'Nenhuma gravação corresponde aos filtros'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecordings.map((recording, index) => {
                    const recordingKey = `${recording.platform}-${recording.native_meeting_id}`
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {recording.platform === 'google_meet' ? 'Google Meet' : 'Teams'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {recording.native_meeting_id}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="text-sm truncate max-w-xs">
                              {recording.filename}
                            </div>

                            {/* Audio Player */}
                            {playingAudio === recordingKey && audioBlobUrls[recordingKey] && (
                              <audio
                                controls
                                className="w-full max-w-sm"
                                autoPlay
                                src={audioBlobUrls[recordingKey]}
                                onError={(e) => {
                                  alert('Erro ao reproduzir áudio.')
                                  setPlayingAudio(null)
                                }}
                              >
                                Seu navegador não suporta o elemento de áudio.
                              </audio>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(recording.file_size)}</TableCell>
                        <TableCell>{formatDuration(recording.duration_seconds)}</TableCell>
                        <TableCell>{getStatusBadge(recording.meeting_status)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(recording.created_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleAudioPlayer(
                                recordingKey,
                                recording.platform,
                                recording.native_meeting_id
                              )}
                              title="Tocar áudio"
                            >
                              <Volume2 className={`h-4 w-4 ${playingAudio === recordingKey ? 'text-green-500' : ''}`} />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(
                                recording.platform,
                                recording.native_meeting_id,
                                recording.filename
                              )}
                              title="Baixar arquivo"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDelete(recording.platform, recording.native_meeting_id)
                              }
                              title="Deletar gravação"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
