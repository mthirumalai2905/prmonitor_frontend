import { useEffect, useState } from "react";
import "./App.css";

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws`;

const EVENT_LABELS = {
  pull_request: "Pull request",
  pull_request_review: "Review",
  pull_request_review_comment: "Review comment",
  pull_request_review_thread: "Review thread",
  issue_comment: "PR comment",
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
            <strong>Summary</strong>
            {event.summary}
          </p>
          <p>
            <strong>Suggestion</strong>
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
    <div className="page">
      <header className="topbar">
        <div>
          <p className="kicker">Live webhook feed</p>
          <h1>GitHub PR Monitor</h1>
        </div>
        <div className={`live ${status}`}>
          <span className="dot" />
          {status}
        </div>
      </header>

      <p className="lede">
        Newest GitHub pull request activity appears at the top, with a short Groq read on what it is
        and what to do next.
      </p>

      {events.length === 0 ? (
        <section className="empty">
          <p className="empty-title">Waiting for events</p>
          <p>Open, review, or comment on a pull request. This list updates as soon as GitHub posts the webhook.</p>
        </section>
      ) : (
        <section className="feed">
          <p className="count">{events.length} event{events.length === 1 ? "" : "s"}</p>
          {events.map((event, index) => (
            <EventCard key={`${event.url}-${event.action}-${index}`} event={event} />
          ))}
        </section>
      )}
    </div>
  );
}
