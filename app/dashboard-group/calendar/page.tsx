'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'
import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { MonthView } from '@/components/calendar/MonthView'
import { WeekView } from '@/components/calendar/WeekView'
import { DayView } from '@/components/calendar/DayView'
import { AgendaView } from '@/components/calendar/AgendaView'
import { EventModal } from '@/components/calendar/EventModal'
import type { CalendarEvent, CalendarView, CreateEventData } from '@/types/calendar'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  format,
  addMonths,
  subMonths,
} from 'date-fns'
import { Clock, MapPin, Video, X, Trash2, Edit3, ChevronDown, Calendar, Check, Link2, Unlink, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { FcGoogle } from 'react-icons/fc'
import { useSearchParams } from 'next/navigation'

type CalendarSource = 'internal' | 'google'

interface GoogleCalendarStatus {
  connected: boolean
  googleEmail: string | null
  syncEnabled: boolean
  lastSyncAt: string | null
  selectedCalendars: string[]
}

export default function CalendarPage() {
  const { accentColor } = useThemeStore()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [view, setView] = useState<CalendarView>('month')
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [eventDetailOpen, setEventDetailOpen] = useState(false)
  const [calendarSource, setCalendarSource] = useState<CalendarSource>('internal')
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  // Check for Google Calendar connection result from URL
  useEffect(() => {
    const googleConnected = searchParams.get('google_connected')
    const error = searchParams.get('error')

    if (googleConnected === 'true') {
      setCalendarSource('google')
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] })
      // Remove query params from URL
      window.history.replaceState({}, '', '/dashboard-group/calendar')
    } else if (error) {
      console.error('Google Calendar connection error:', error)
      window.history.replaceState({}, '', '/dashboard-group/calendar')
    }
  }, [searchParams, queryClient])

  // Fetch Google Calendar connection status
  const { data: googleStatus } = useQuery<GoogleCalendarStatus>({
    queryKey: ['google-calendar-status'],
    queryFn: async () => {
      const res = await fetch('/api/google-calendar/status')
      if (!res.ok) throw new Error('Failed to fetch status')
      return res.json()
    },
  })

  const getAccentClasses = () => {
    switch (accentColor) {
      case 'purple': return { bg: 'bg-purple-500', light: 'bg-purple-100 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400' }
      case 'blue': return { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' }
      case 'green': return { bg: 'bg-green-500', light: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400' }
      case 'orange': return { bg: 'bg-orange-500', light: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-600 dark:text-orange-400' }
      case 'pink': return { bg: 'bg-pink-500', light: 'bg-pink-100 dark:bg-pink-500/20', text: 'text-pink-600 dark:text-pink-400' }
      case 'red': return { bg: 'bg-red-500', light: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400' }
      case 'yellow': return { bg: 'bg-yellow-500', light: 'bg-yellow-100 dark:bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400' }
      case 'cyan': return { bg: 'bg-cyan-500', light: 'bg-cyan-100 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400' }
      default: return { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400' }
    }
  }

  const accent = getAccentClasses()

  // Calculate date range for fetching events
  const getDateRange = useCallback(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

    return {
      start: format(calendarStart, 'yyyy-MM-dd'),
      end: format(calendarEnd, 'yyyy-MM-dd'),
    }
  }, [currentDate])

  // Fetch internal events
  const { data: internalEvents = [], isLoading: isLoadingInternal } = useQuery({
    queryKey: ['calendar-events', getDateRange()],
    queryFn: async () => {
      const { start, end } = getDateRange()
      const res = await fetch(`/api/calendar/events?start_date=${start}&end_date=${end}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json()
    },
  })

  // Fetch Google Calendar events
  const { data: googleEventsData, isLoading: isLoadingGoogle } = useQuery({
    queryKey: ['google-calendar-events', getDateRange()],
    queryFn: async () => {
      const { start, end } = getDateRange()
      const res = await fetch(
        `/api/google-calendar/events?timeMin=${start}T00:00:00Z&timeMax=${end}T23:59:59Z`
      )
      if (!res.ok) {
        const data = await res.json()
        if (data.needsAuth) {
          return { events: [], needsAuth: true }
        }
        throw new Error('Failed to fetch Google events')
      }
      return res.json()
    },
    enabled: googleStatus?.connected === true,
  })

  // Get events based on selected source
  const events = calendarSource === 'google'
    ? (googleEventsData?.events || []).map((e: any) => ({
        ...e,
        id: e.google_event_id,
        source: 'google' as const,
      }))
    : internalEvents

  const isLoading = calendarSource === 'google' ? isLoadingGoogle : isLoadingInternal

  // Connect to Google Calendar
  const connectGoogle = async () => {
    setIsConnecting(true)
    try {
      const res = await fetch('/api/google-calendar/auth')
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Failed to connect Google Calendar:', error)
      setIsConnecting(false)
    }
  }

  // Disconnect from Google Calendar
  const disconnectGoogle = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/google-calendar/disconnect', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to disconnect')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] })
      queryClient.invalidateQueries({ queryKey: ['google-calendar-events'] })
      setCalendarSource('internal')
    },
  })

  // Create event mutation
  const createEvent = useMutation({
    mutationFn: async (data: CreateEventData) => {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setIsEventModalOpen(false)
      setSelectedDate(null)
    },
  })

  // Update event mutation
  const updateEvent = useMutation({
    mutationFn: async (data: CreateEventData & { id: string }) => {
      const res = await fetch('/api/calendar/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setIsEventModalOpen(false)
      setSelectedEvent(null)
      setEventDetailOpen(false)
    },
  })

  // Delete event mutation
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await fetch(`/api/calendar/events?id=${eventId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] })
      setSelectedEvent(null)
      setEventDetailOpen(false)
      setIsEventModalOpen(false)
    },
  })

  const handleDateChange = (date: Date) => {
    setCurrentDate(date)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date)
  }

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventDetailOpen(true)
  }

  const handleCreateEvent = (date: Date) => {
    setSelectedDate(date)
    setSelectedEvent(null)
    setIsEventModalOpen(true)
  }

  const handleAddEvent = () => {
    setSelectedDate(selectedDate || new Date())
    setSelectedEvent(null)
    setIsEventModalOpen(true)
  }

  const handleEditEvent = () => {
    setEventDetailOpen(false)
    setIsEventModalOpen(true)
  }

  const handleSubmitEvent = (data: CreateEventData) => {
    if (selectedEvent) {
      updateEvent.mutate({ ...data, id: selectedEvent.id })
    } else {
      createEvent.mutate(data)
    }
  }

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('이 일정을 삭제하시겠습니까?')) {
      deleteEvent.mutate(eventId)
    }
  }

  const renderView = () => {
    switch (view) {
      case 'month':
        return (
          <MonthView
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={handleCreateEvent}
          />
        )
      case 'week':
        return (
          <WeekView
            currentDate={currentDate}
            events={events}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={handleCreateEvent}
          />
        )
      case 'day':
        return (
          <DayView
            currentDate={selectedDate || currentDate}
            events={events}
            onSelectEvent={handleSelectEvent}
            onCreateEvent={handleCreateEvent}
          />
        )
      case 'agenda':
        return (
          <AgendaView
            currentDate={currentDate}
            events={events}
            onSelectEvent={handleSelectEvent}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Calendar Source Dropdown */}
      <div className="flex items-start justify-between">
        <div>
          {/* Calendar Source Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
              className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg transition-colors -ml-3"
            >
              {calendarSource === 'internal' ? (
                <Calendar className="w-6 h-6 text-zinc-600 dark:text-zinc-400" />
              ) : (
                <FcGoogle className="w-6 h-6" />
              )}
              <span>{calendarSource === 'internal' ? '내 캘린더' : 'Google Calendar'}</span>
              <ChevronDown className={cn(
                "w-5 h-5 text-zinc-400 transition-transform",
                isSourceDropdownOpen && "rotate-180"
              )} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isSourceDropdownOpen && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsSourceDropdownOpen(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xl z-20 overflow-hidden"
                  >
                    {/* Internal Calendar */}
                    <button
                      onClick={() => {
                        setCalendarSource('internal')
                        setIsSourceDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors",
                        calendarSource === 'internal' && "bg-zinc-50 dark:bg-zinc-800"
                      )}
                    >
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-zinc-900 dark:text-white">내 캘린더</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">기본 일정 관리</div>
                      </div>
                      {calendarSource === 'internal' && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                    </button>

                    <div className="border-t border-zinc-200 dark:border-zinc-700" />

                    {/* Google Calendar - Connected */}
                    {googleStatus?.connected ? (
                      <>
                        <button
                          onClick={() => {
                            setCalendarSource('google')
                            setIsSourceDropdownOpen(false)
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors",
                            calendarSource === 'google' && "bg-zinc-50 dark:bg-zinc-800"
                          )}
                        >
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <FcGoogle className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-zinc-900 dark:text-white">Google Calendar</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                              {googleStatus.googleEmail}
                            </div>
                          </div>
                          {calendarSource === 'google' && (
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                          )}
                        </button>

                        {/* Disconnect Option */}
                        <div className="border-t border-zinc-200 dark:border-zinc-700" />
                        <button
                          onClick={() => {
                            if (confirm('Google Calendar 연동을 해제하시겠습니까?')) {
                              disconnectGoogle.mutate()
                              setIsSourceDropdownOpen(false)
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-red-600 dark:text-red-400"
                        >
                          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                            <Unlink className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">연동 해제</div>
                            <div className="text-xs opacity-75">Google Calendar 연결 끊기</div>
                          </div>
                        </button>
                      </>
                    ) : (
                      /* Google Calendar - Not Connected */
                      <>
                        <button
                          onClick={() => {
                            connectGoogle()
                            setIsSourceDropdownOpen(false)
                          }}
                          disabled={isConnecting}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                        >
                          <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            {isConnecting ? (
                              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
                            ) : (
                              <FcGoogle className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-zinc-900 dark:text-white">Google Calendar</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {isConnecting ? '연결 중...' : '클릭하여 연동하기'}
                            </div>
                          </div>
                          <Link2 className="w-5 h-5 text-zinc-400" />
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 ml-0">
            일정을 확인하고 관리하세요
          </p>
        </div>
      </div>

      {/* Calendar Header */}
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onDateChange={handleDateChange}
        onViewChange={setView}
        onAddEvent={handleAddEvent}
        onToday={handleToday}
      />

      {/* Google Calendar Sync Info */}
      {calendarSource === 'google' && googleStatus?.connected && googleEventsData?.lastSync && (
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <FcGoogle className="w-4 h-4" />
          <span>{googleStatus.googleEmail}</span>
          <span className="mx-1">•</span>
          <span>마지막 동기화: {format(new Date(googleEventsData.lastSync), 'HH:mm')}</span>
        </div>
      )}

      {/* Calendar View */}
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isLoading ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className={cn("w-12 h-12 rounded-full border-4 border-t-transparent animate-spin", `border-${accentColor}-500`)} />
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                {calendarSource === 'google' ? 'Google Calendar에서 일정을 불러오는 중...' : '일정을 불러오는 중...'}
              </p>
            </div>
          </div>
        ) : calendarSource === 'google' && !googleStatus?.connected ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <FcGoogle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Google Calendar 연동 필요</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center mb-4">
                Google Calendar를 연동하여 일정을 확인하세요
              </p>
              <Button
                variant="accent"
                onClick={connectGoogle}
                disabled={isConnecting}
                leftIcon={isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FcGoogle className="w-4 h-4" />}
              >
                {isConnecting ? '연결 중...' : 'Google Calendar 연동하기'}
              </Button>
            </div>
          </div>
        ) : (
          renderView()
        )}
      </motion.div>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false)
          setSelectedEvent(null)
        }}
        onSubmit={handleSubmitEvent}
        onDelete={handleDeleteEvent}
        event={selectedEvent}
        selectedDate={selectedDate}
        isLoading={createEvent.isPending || updateEvent.isPending}
      />

      {/* Event Detail Drawer */}
      <AnimatePresence>
        {eventDetailOpen && selectedEvent && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEventDetailOpen(false)}
              className="fixed inset-0 bg-black/40 z-[90]"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 shadow-2xl z-[95] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white">일정 상세</h2>
                <button
                  onClick={() => setEventDetailOpen(false)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto h-[calc(100%-140px)]">
                {/* Color Bar */}
                <div className={cn("h-2 rounded-full mb-4", `bg-${selectedEvent.color}-500`)} />

                {/* Title */}
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
                  {selectedEvent.title}
                </h3>

                {/* Time */}
                <div className="flex items-start gap-3 mb-4">
                  <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-white">
                      {selectedEvent.all_day
                        ? '종일'
                        : `${format(new Date(selectedEvent.start_time), 'yyyy년 M월 d일 HH:mm')} - ${format(new Date(selectedEvent.end_time), 'HH:mm')}`
                      }
                    </div>
                    {selectedEvent.is_recurring && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        반복 일정
                      </div>
                    )}
                  </div>
                </div>

                {/* Location */}
                {selectedEvent.location && (
                  <div className="flex items-start gap-3 mb-4">
                    <MapPin className="w-5 h-5 text-zinc-400 mt-0.5" />
                    <div className="text-sm text-zinc-900 dark:text-white">
                      {selectedEvent.location}
                    </div>
                  </div>
                )}

                {/* Meeting URL */}
                {selectedEvent.meeting_url && (
                  <div className="flex items-start gap-3 mb-4">
                    <Video className="w-5 h-5 text-zinc-400 mt-0.5" />
                    <a
                      href={selectedEvent.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn("text-sm underline", accent.text)}
                    >
                      온라인 미팅 참여
                    </a>
                  </div>
                )}

                {/* Description */}
                {selectedEvent.description && (
                  <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2">설명</h4>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Attendees */}
                {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">참석자</h4>
                    <div className="space-y-2">
                      {selectedEvent.attendees.map((attendee) => (
                        <div
                          key={attendee.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                        >
                          <img
                            src={attendee.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${attendee.user?.name || attendee.email}&backgroundColor=e4e4e7`}
                            alt=""
                            className="w-8 h-8 rounded-full"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                              {attendee.user?.name || attendee.email}
                            </div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {attendee.is_organizer ? '주최자' : attendee.response_status === 'accepted' ? '수락' : attendee.response_status === 'declined' ? '거절' : '대기중'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                {(selectedEvent as any).source === 'google' ? (
                  /* Google Calendar Event - Read Only */
                  <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <FcGoogle className="w-4 h-4" />
                    <span>Google Calendar 이벤트 (읽기 전용)</span>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => handleDeleteEvent(selectedEvent.id)}
                      className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/10"
                      leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                      삭제
                    </Button>
                    <Button
                      variant="accent"
                      size="md"
                      onClick={handleEditEvent}
                      leftIcon={<Edit3 className="w-4 h-4" />}
                    >
                      수정
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
