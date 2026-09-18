import { useEffect, useMemo, useState } from "react";
import "./App.css";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

const EVENT_LABELS = {
  pull_request: "pull request",
  pull_request_review: "review",
  pull_request_review_comment: "review comment",
  pull_request_review_thread: "review thread",
  issue_comment: "pr comment",
};

function kindClass(kind) {
  const value = (kind || "unknown").toLowerCase().replaceAll(" ", "_");
  return `chip chip-${value}`;
}

function EventCard({ event }) {
  return (
    <article className="card">
      <div className="card-top">
        <span className="chip chip-event">{EVENT_LABELS[event.event_type] || event.event_type}</span>
        {event.kind ? <span className={kindClass(event.kind)}>{event.kind}</span> : null}
        {event.action ? <span className="chip chip-action">{event.action}</span> : null}
      </div>

      <h2 className="pr-title">
        <span className="pr-number">#{event.number}</span> {event.title}
      </h2>
      <p className="repo">{event.repository}</p>

      <dl className="meta">
        <div>
          <dt>Author</dt>
          <dd>{event.author || "-"}</dd>
        </div>
        {event.actor ? (
          <div>
            <dt>Actor</dt>
            <dd>{event.actor}</dd>
          </div>
        ) : null}
        {event.review_state ? (
          <div>
            <dt>Review</dt>
            <dd>{event.review_state}</dd>
          </div>
        ) : null}
        {event.file_path ? (
          <div className="wide">
            <dt>File</dt>
            <dd className="mono">{event.file_path}</dd>
          </div>
        ) : null}
      </dl>

      {event.detail ? <p className="detail">{event.detail}</p> : null}

      {event.summary ? (
        <div className="insight">
          <p>
            <span>Model summary</span>
            {event.summary}
          </p>
          <p>
            <span>Next action</span>
            {event.suggestion}
          </p>
        </div>
      ) : null}

      {event.url ? (
        <a className="pr-link" href={event.url} target="_blank" rel="noreferrer">
          Open on GitHub
        </a>
      ) : null}
    </article>
  );
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("connecting");
  const prCount = useMemo(
    () => new Set(events.filter((event) => event.event_type === "pull_request").map((event) => event.number)).size,
    [events]
  );

  useEffect(() => {
    let socket;
    let retry;
    let stopped = false;

    const connect = () => {
      if (stopped) {
        return;
      }

      socket = new WebSocket(WS_URL);

      socket.onopen = () => setStatus("connected");
      socket.onclose = () => {
        setStatus("disconnected");
        if (!stopped) {
          retry = setTimeout(connect, 1000);
        }
      };
      socket.onmessage = (message) => {
        const payload = JSON.parse(message.data);
        if (payload.type === "ping") {
          return;
        }
        if (payload.type === "snapshot") {
          if (payload.events && payload.events.length) {
            setEvents(payload.events);
          }
          return;
        }
        if (!payload.event_type) {
          return;
        }
        setEvents((current) => [payload, ...current]);
      };
    };

    connect();

    return () => {
      stopped = true;
      clearTimeout(retry);
      if (socket) {
        socket.close();
      }
    };
  }, []);

  return (
    <div className="shell">
      <header className="nav">
        <div className="brand">
          <div className="mark">PR</div>
          <div className="brand-copy">
            <strong>PR Monitor</strong>
            <span>Lab console</span>
          </div>
        </div>
        <div className={`live ${status}`}>
          <span className="dot" />
          {status}
        </div>
      </header>

      <section className="hero">
        <p className="kicker">Realtime GitHub instrument</p>
        <h1>Watch pull requests as they move.</h1>
        <p className="lede">
          Webhooks land on Render, Groq classifies the change, and this console updates over a
          WebSocket. Newest activity stays at the top.
        </p>
        <dl className="stats">
          <div className="stat">
            <dt>Events</dt>
            <dd>{events.length}</dd>
          </div>
          <div className="stat">
            <dt>Pull requests</dt>
            <dd>{prCount}</dd>
          </div>
          <div className="stat">
            <dt>Channel</dt>
            <dd>{status === "connected" ? "live" : "idle"}</dd>
          </div>
        </dl>
      </section>

      {events.length === 0 ? (
        <section className="empty">
          <p className="empty-kicker">Stream</p>
          <h2>Waiting for a GitHub signal</h2>
          <p>Open a pull request or add a comment. This view updates as soon as the webhook arrives.</p>
        </section>
      ) : (
        <section>
          <div className="feed-head">
            <h2>Activity</h2>
            <p className="kicker">{events.length} records</p>
          </div>
          <div className="feed">
            {events.map((event, index) => (
              <EventCard key={`${event.url}-${event.action}-${index}`} event={event} />
            ))}
          </div>
        </section>
      )}

      <p className="foot">Render webhook · Groq classify · Vercel console</p>
    </div>
  );
}
