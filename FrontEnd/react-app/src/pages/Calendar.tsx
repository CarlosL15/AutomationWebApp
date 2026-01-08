import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  api,
  SocialAccount,
  ScheduledContent,
  CalendarEvent,
} from "../services/api";

export default function Calendar() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    platform: "instagram",
    content_type: "post",
    title: "",
    caption: "",
    hashtags: "",
    scheduled_time: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }
    loadData();
  }, [navigate]);

  async function loadData() {
    try {
      setLoading(true);
      const [accountsData, calendarData, scheduledData] = await Promise.all([
        api.getAccounts(),
        api.getCalendar(),
        api.getScheduledContent(),
      ]);
      setAccounts(accountsData);
      setEvents(calendarData.events);
      setScheduled(scheduledData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSchedule() {
    if (!formData.scheduled_time) {
      alert("Please select a date and time");
      return;
    }

    try {
      await api.createScheduledContent({
        platform: formData.platform,
        content_type: formData.content_type,
        title: formData.title || undefined,
        caption: formData.caption || undefined,
        hashtags: formData.hashtags || undefined,
        scheduled_time: new Date(formData.scheduled_time).toISOString(),
      });
      setShowCreateModal(false);
      setFormData({
        platform: "instagram",
        content_type: "post",
        title: "",
        caption: "",
        hashtags: "",
        scheduled_time: "",
      });
      await loadData();
    } catch (err) {
      console.error("Failed to create schedule:", err);
      alert("Failed to create scheduled content");
    }
  }

  async function handleDeleteSchedule(scheduleId: number) {
    if (!confirm("Are you sure you want to delete this scheduled content?")) {
      return;
    }

    try {
      await api.deleteScheduledContent(scheduleId);
      await loadData();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  }

  const cardStyle = {
    backgroundColor: "#1a1a2e",
    borderRadius: 12,
    padding: 24,
    border: "1px solid #2a2a3e",
  };

  const platformColors: Record<string, string> = {
    instagram: "#E1306C",
    facebook: "#4267B2",
    tiktok: "#000000",
  };

  const platformIcons: Record<string, string> = {
    instagram: "📸",
    facebook: "👤",
    tiktok: "🎵",
  };

  const contentTypeIcons: Record<string, string> = {
    post: "📝",
    story: "📖",
    reel: "🎬",
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    return { daysInMonth, firstDayOfMonth };
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const getEventsForDay = (day: number) => {
    const date = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );
    return events.filter((event) => isSameDay(new Date(event.scheduled_time), date));
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const { daysInMonth, firstDayOfMonth } = getDaysInMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "#888" }}>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "2rem",
              marginBottom: 8,
              background: "linear-gradient(90deg, #646cff, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            📅 Content Calendar
          </h1>
          <p style={{ color: "#888" }}>
            Schedule your posts, stories, and reels
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: "12px 24px",
            backgroundColor: "#646cff",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          + Schedule Content
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        {/* Calendar Grid */}
        <div style={cardStyle}>
          {/* Calendar Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <button
              onClick={prevMonth}
              style={{
                padding: "8px 16px",
                backgroundColor: "#2a2a3e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              ← Prev
            </button>
            <h2 style={{ margin: 0 }}>
              {currentMonth.toLocaleDateString([], {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <button
              onClick={nextMonth}
              style={{
                padding: "8px 16px",
                backgroundColor: "#2a2a3e",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Next →
            </button>
          </div>

          {/* Day Headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
              marginBottom: 8,
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: "center",
                  padding: 8,
                  color: "#888",
                  fontWeight: 500,
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
            }}
          >
            {/* Empty days */}
            {emptyDays.map((_, index) => (
              <div
                key={`empty-${index}`}
                style={{
                  minHeight: 80,
                  backgroundColor: "#1f1f2e",
                  borderRadius: 8,
                }}
              />
            ))}

            {/* Actual days */}
            {days.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
                new Date()
              );
              const isSelected = isSameDay(
                new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day),
                selectedDate
              );

              return (
                <div
                  key={day}
                  onClick={() =>
                    setSelectedDate(
                      new Date(
                        currentMonth.getFullYear(),
                        currentMonth.getMonth(),
                        day
                      )
                    )
                  }
                  style={{
                    minHeight: 80,
                    backgroundColor: isSelected
                      ? "#3a3a4e"
                      : isToday
                      ? "#2a2a4e"
                      : "#2a2a3e",
                    borderRadius: 8,
                    padding: 8,
                    cursor: "pointer",
                    border: isToday ? "2px solid #646cff" : "none",
                  }}
                >
                  <div
                    style={{
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "#646cff" : "#fff",
                      marginBottom: 4,
                    }}
                  >
                    {day}
                  </div>
                  {dayEvents.slice(0, 2).map((event, index) => (
                    <div
                      key={index}
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 4px",
                        backgroundColor: platformColors[event.platform] || "#646cff",
                        borderRadius: 4,
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {contentTypeIcons[event.content_type]} {formatTime(event.scheduled_time)}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div style={{ fontSize: "0.7rem", color: "#888" }}>
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scheduled Content List */}
        <div style={cardStyle}>
          <h3 style={{ marginBottom: 16 }}>📋 Upcoming Content</h3>
          {scheduled.filter((s) => s.status === "pending").length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ color: "#888" }}>No upcoming content scheduled</p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  marginTop: 16,
                  padding: "10px 20px",
                  backgroundColor: "#646cff",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Schedule Something
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {scheduled
                .filter((s) => s.status === "pending")
                .sort(
                  (a, b) =>
                    new Date(a.scheduled_time).getTime() -
                    new Date(b.scheduled_time).getTime()
                )
                .slice(0, 10)
                .map((item) => (
                  <div
                    key={item.schedule_id}
                    style={{
                      padding: 16,
                      backgroundColor: "#2a2a3e",
                      borderRadius: 8,
                      borderLeft: `3px solid ${
                        platformColors[item.platform] || "#646cff"
                      }`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>{platformIcons[item.platform]}</span>
                        <span>{contentTypeIcons[item.content_type]}</span>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            backgroundColor: "#3a3a4e",
                            padding: "2px 8px",
                            borderRadius: 10,
                          }}
                        >
                          {item.content_type}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSchedule(item.schedule_id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          fontSize: "1rem",
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                    {item.title && (
                      <p style={{ fontWeight: 600, marginBottom: 4 }}>
                        {item.title}
                      </p>
                    )}
                    {item.caption && (
                      <p
                        style={{
                          color: "#888",
                          fontSize: "0.85rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          marginBottom: 8,
                        }}
                      >
                        {item.caption}
                      </p>
                    )}
                    <p style={{ color: "#646cff", fontSize: "0.85rem" }}>
                      🕐 {formatDate(item.scheduled_time)}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Reminder Banner */}
      {scheduled.filter(
        (s) =>
          s.status === "pending" &&
          new Date(s.scheduled_time).getTime() - new Date().getTime() <
            24 * 60 * 60 * 1000 &&
          new Date(s.scheduled_time).getTime() > new Date().getTime()
      ).length > 0 && (
        <div
          style={{
            ...cardStyle,
            marginTop: 24,
            backgroundColor: "#2a1a2e",
            borderColor: "#a855f7",
          }}
        >
          <h3 style={{ marginBottom: 12, color: "#a855f7" }}>
            ⏰ Upcoming in 24 Hours
          </h3>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {scheduled
              .filter(
                (s) =>
                  s.status === "pending" &&
                  new Date(s.scheduled_time).getTime() - new Date().getTime() <
                    24 * 60 * 60 * 1000 &&
                  new Date(s.scheduled_time).getTime() > new Date().getTime()
              )
              .map((item) => (
                <div
                  key={item.schedule_id}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#3a2a4e",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {platformIcons[item.platform]}
                  {contentTypeIcons[item.content_type]}
                  <span>{item.title || `${item.content_type} on ${item.platform}`}</span>
                  <span style={{ color: "#888" }}>
                    @ {formatTime(item.scheduled_time)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: "#1a1a2e",
              borderRadius: 16,
              padding: 32,
              width: "90%",
              maxWidth: 500,
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid #2a2a3e",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 24 }}>📅 Schedule Content</h2>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#ccc",
                  fontWeight: 500,
                }}
              >
                Platform
              </label>
              <div style={{ display: "flex", gap: 12 }}>
                {["instagram", "facebook", "tiktok"].map((platform) => (
                  <button
                    key={platform}
                    onClick={() =>
                      setFormData({ ...formData, platform })
                    }
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor:
                        formData.platform === platform
                          ? platformColors[platform]
                          : "#2a2a3e",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {platformIcons[platform]}{" "}
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#ccc",
                  fontWeight: 500,
                }}
              >
                Content Type
              </label>
              <div style={{ display: "flex", gap: 12 }}>
                {["post", "story", "reel"].map((type) => (
                  <button
                    key={type}
                    onClick={() =>
                      setFormData({ ...formData, content_type: type })
                    }
                    style={{
                      flex: 1,
                      padding: "12px",
                      backgroundColor:
                        formData.content_type === type ? "#646cff" : "#2a2a3e",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {contentTypeIcons[type]}{" "}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#ccc",
                  fontWeight: 500,
                }}
              >
                Title (optional)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Product Launch Announcement"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #444",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#ccc",
                  fontWeight: 500,
                }}
              >
                Caption (optional)
              </label>
              <textarea
                value={formData.caption}
                onChange={(e) =>
                  setFormData({ ...formData, caption: e.target.value })
                }
                placeholder="Write your caption here..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #444",
                  borderRadius: 8,
                  color: "#fff",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#ccc",
                  fontWeight: 500,
                }}
              >
                Hashtags (optional)
              </label>
              <input
                type="text"
                value={formData.hashtags}
                onChange={(e) =>
                  setFormData({ ...formData, hashtags: e.target.value })
                }
                placeholder="#marketing #socialmedia #content"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #444",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  color: "#ccc",
                  fontWeight: 500,
                }}
              >
                Schedule Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_time}
                onChange={(e) =>
                  setFormData({ ...formData, scheduled_time: e.target.value })
                }
                min={new Date().toISOString().slice(0, 16)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: "#2a2a2a",
                  border: "1px solid #444",
                  borderRadius: 8,
                  color: "#fff",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: "transparent",
                  color: "#888",
                  border: "1px solid #444",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSchedule}
                style={{
                  flex: 1,
                  padding: "14px",
                  backgroundColor: "#646cff",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}