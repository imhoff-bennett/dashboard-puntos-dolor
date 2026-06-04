import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  Check,
  ChevronRight,
  CircleDot,
  ClipboardList,
  ChevronDown,
  Pencil,
  Lightbulb,
  Link as LinkIcon,
  Map,
  Plus,
  Sparkles,
  Trash2,
  Hand,
  ThumbsDown,
  ThumbsUp,
  X,
  UserRound
} from "lucide-react";
import "./styles.css";

const smartFields = [
  ["specific", "Específico"],
  ["measurable", "Medible"],
  ["achievable", "Alcanzable"],
  ["relevant", "Relevante"]
];

const painPointStatuses = ["Abierto", "Mitigado", "Resuelto", "Replanificación"];
const commitmentStatuses = ["Planificado", "Activo", "Completado", "Fallido"];
const guideSteps = [
  {
    key: "pain",
    title: "Creá el primer punto de dolor",
    body: "Escribí un problema concreto del equipo. Ese será el origen del mapa."
  },
  {
    key: "idea",
    title: "Agregá una idea de compromiso",
    body: "Proponé una forma concreta de abordar ese dolor. Después el equipo podrá votarla."
  },
  {
    key: "vote",
    title: "Voten y cierren la votación",
    body: "Clickeá \"A votar\". Podés votar que sí con pulgar arriba, que no con pulgar abajo o apoyar la decisión con la mano alzada. Cuando todos hayan votado, hacé click en \"Cerrar votación\"."
  },
  {
    key: "winner",
    title: "Esta es la idea ganadora",
    body: "Cuando se cierra la votación, la idea más votada queda resaltada. Con esa idea se va a crear el compromiso."
  },
  {
    key: "commitment",
    title: "Convertí la idea en compromiso",
    body: "Usá la idea ganadora para crear el compromiso que el equipo va a seguir."
  },
  {
    key: "smart",
    title: "Completá SMART y fecha de fin",
    body: "En Guardianes, agregá las personas que van a cuidar que el compromiso avance. Después de escribir cada nombre, apretá Enter.\n\nDespués definí \"Específico\", \"Medible\", \"Alcanzable\", \"Relevante\" y una fecha de fin."
  },
  {
    key: "start",
    title: "Iniciá el compromiso",
    body: "Cuando esté claro, iniciá el compromiso. A partir de ahí queda en modo lectura."
  },
  {
    key: "log",
    title: "Registrá el primer log",
    body: "Agregá un avance para empezar a construir la historia del seguimiento."
  },
  {
    key: "logTools",
    title: "Podés editar o eliminar logs",
    body: "Cada log conserva su trazabilidad, pero si necesitás corregirlo o eliminarlo, usá el lápiz o el tachito."
  },
  {
    key: "close",
    title: "Dale cierre al compromiso",
    body: "Al final, indicá si el compromiso fue completado o fallido, qué pasó con el punto de dolor y cerrá el ciclo."
  },
  {
    key: "share",
    title: "Compartí el tablero con tu equipo",
    body: "Hacé click en Compartir para copiar el enlace. Cualquier persona con esa URL puede entrar y trabajar en este mismo tablero con vos.\n\nSi necesitás volver a ver esta guía, hacé click en Guía."
  }
];
const statusTranslations = {
  Open: "Abierto",
  Mitigated: "Mitigado",
  Solved: "Resuelto",
  Planned: "Planificado",
  Active: "Activo",
  Completed: "Completado",
  Failed: "Fallido"
};

const emptyReactions = () => ({ up: 0, down: 0, fist: 0 });

const getReactions = (idea) => ({
  ...emptyReactions(),
  ...(idea.reactions || {})
});

const ideaScore = (idea) => {
  const reactions = getReactions(idea);
  return reactions.up + reactions.fist - reactions.down;
};

const formatDate = (date) => {
  if (!date) return "";
  const [year, month, day] = date.slice(0, 10).split("-");
  return day && month && year ? `${day}/${month}/${year}` : date;
};

const buildTimelineItems = (commitment, checkpoints, outcome) => [
  { id: "created", label: "Creación", date: commitment?.createdAt || commitment?.startDate || "" },
  ...(commitment?.startedAt
    ? [{ id: "started", label: "Inicio", date: commitment.startedAt }]
    : []),
  ...checkpoints.map((checkpoint, index) => ({
    id: checkpoint.id,
    label: checkpoint.summary || checkpoint.notes || (index === 0 ? "Primer avance" : `Avance ${index + 1}`),
    date: checkpoint.date
  })),
  ...(["Completado", "Fallido"].includes(commitment?.status)
    ? [
        {
          id: "closed",
          label: "Cierre",
          date: outcome?.closedAt || ""
        }
      ]
    : [])
];

const uid = () =>
  Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

const boardId = () =>
  Array.from({ length: 6 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789".charAt(
      Math.floor(Math.random() * 57)
    )
  ).join("");

const localKey = (id) => `mapa-de-compromisos:${id}`;
const isLocalDevelopment = () =>
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);

const translateStatus = (status) => statusTranslations[status] || status;

const commitmentStatusClass = (status) =>
  status === "Completado"
    ? "commitment-status-completed"
    : status === "Fallido"
      ? "commitment-status-failed"
      : "";

const getGuideCompletion = (board, guideStep) => {
  if (!board || guideStep === null) return false;
  const stepKey = guideSteps[guideStep]?.key;
  const guidePainPoint = board.painPoints[0];
  const guideCommitments = guidePainPoint
    ? board.commitments.filter((commitment) => commitment.painPointId === guidePainPoint.id)
    : [];
  const hasReadyCommitment = guideCommitments.some((commitment) => {
    const smart = commitment.smart || {};
    return commitment.targetDate && smartFields.every(([key]) => (smart[key] || "").trim());
  });
  const completedByStep = {
    pain: board.painPoints.length > 0,
    idea: Boolean(guidePainPoint && board.ideas.some((idea) => idea.painPointId === guidePainPoint.id)),
    vote: Boolean(guidePainPoint?.votingClosed),
    winner: Boolean(guidePainPoint?.votingClosed),
    commitment: guideCommitments.length > 0,
    smart: hasReadyCommitment,
    start: guideCommitments.some((commitment) => commitment.status !== "Planificado"),
    log: board.checkpoints.some((checkpoint) =>
      guideCommitments.some((commitment) => commitment.id === checkpoint.commitmentId)
    ),
    logTools: board.checkpoints.some((checkpoint) =>
      guideCommitments.some((commitment) => commitment.id === checkpoint.commitmentId)
    ),
    close: guideCommitments.some((commitment) => ["Completado", "Fallido"].includes(commitment.status)),
    share: true
  };

  return Boolean(completedByStep[stepKey]);
};

const emptyBoard = (id, teamName, description) => ({
  id,
  teamName,
  description,
  createdAt: new Date().toISOString(),
  painPoints: [],
  ideas: [],
  commitments: [],
  checkpoints: [],
  outcomes: {}
});

const normalizeBoard = (board) => ({
  ...board,
  painPoints: (board.painPoints || []).map((item) => ({
    ...item,
    status: translateStatus(item.status)
  })),
  ideas: (board.ideas || []).map((item) => ({
    ...item,
    reactions: item.reactions || {
      ...emptyReactions(),
      up: item.votes || 0
    }
  })),
  commitments: (board.commitments || []).map((item) => ({
    ...item,
    status: translateStatus(item.status)
  })),
  checkpoints: board.checkpoints || [],
  outcomes: board.outcomes || {}
});

async function loadBoard(id) {
  try {
    const res = await fetch(`/.netlify/functions/tablero?id=${id}`);
    if (res.ok) return normalizeBoard(await res.json());
    if (!isLocalDevelopment()) return null;
  } catch {
    if (!isLocalDevelopment()) return null;
  }

  // Fallback temporal para correr con Vite puro. Con `netlify dev` y en producción,
  // la fuente principal es Netlify Blobs vía la Function.
  const stored = localStorage.getItem(localKey(id));
  return stored ? normalizeBoard(JSON.parse(stored)) : null;
}

async function saveBoard(board, options = {}) {
  const { requireRemote = false } = options;
  try {
    const res = await fetch(`/.netlify/functions/tablero?id=${board.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(board)
    });
    if (!res.ok) {
      throw new Error(`No se pudo guardar el tablero compartible (${res.status})`);
    }
    localStorage.setItem(localKey(board.id), JSON.stringify(board));
    return { localSaved: true, remoteSaved: true };
  } catch {
    if (requireRemote) {
      throw new Error("No se pudo guardar el tablero compartible.");
    }

    // Fallback temporal para desarrollo sin Netlify Functions.
    localStorage.setItem(localKey(board.id), JSON.stringify(board));
    return { localSaved: true, remoteSaved: false };
  }
}

function Home() {
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const createBoard = async (event) => {
    event.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const id = boardId();
      const board = emptyBoard(id, teamName.trim(), description.trim());
      await saveBoard(board, { requireRemote: !isLocalDevelopment() });
      window.history.pushState({}, "", `/tablero/${id}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch {
      setCreateError("No se pudo crear un tablero compartible. Revisá que las funciones de Netlify estén activas e intentá de nuevo.");
      setCreating(false);
    }
  };

  return (
    <main className="home-shell">
      <section className="home-panel">
        <div className="brand-row">
          <div className="brand-mark">
            <Map size={22} />
          </div>
          <span>Mapa de Compromisos</span>
        </div>
        <h1>Convertí dolores del equipo en compromisos con seguimiento.</h1>
        <form className="create-form" onSubmit={createBoard}>
          <label>
            Nombre del equipo
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Ej: Team A"
              autoFocus
            />
          </label>
          <label>
            Descripción opcional
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ej: Conversación sobre priorización del roadmap"
              rows={3}
            />
          </label>
          <button className="primary-button" disabled={!teamName.trim() || creating}>
            <Plus size={18} />
            Crear nuevo tablero
          </button>
          {createError && <p className="form-error">{createError}</p>}
        </form>
      </section>
    </main>
  );
}

function BoardPage({ id }) {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [saveError, setSaveError] = useState(false);
  const [guideStep, setGuideStep] = useState(null);
  const [guideMode, setGuideMode] = useState("interactive");

  useEffect(() => {
    loadBoard(id).then((data) => {
      setBoard(data);
      setMissing(!data);
      setLoading(false);
      if (
        data &&
        !data.onboardingCompleted &&
        localStorage.getItem(`guia-saltada:${id}`) !== "true"
      ) {
        setGuideStep(0);
        setGuideMode("interactive");
      }
    });
  }, [id]);

  useEffect(() => {
    if (!board) return;
    const timer = setTimeout(() => {
      saveBoard(board, { requireRemote: !isLocalDevelopment() })
        .then(() => {
          setSavedAt(new Date());
          setSaveError(false);
        })
        .catch(() => setSaveError(true));
    }, 300);
    return () => clearTimeout(timer);
  }, [board]);

  const updateBoard = (updater) =>
    setBoard((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return { ...next, updatedAt: new Date().toISOString() };
    });

  const completeGuide = () => {
    localStorage.setItem(`guia-saltada:${id}`, "true");
    setGuideStep(null);
    if (board && !board.onboardingCompleted) {
      updateBoard({ ...board, onboardingCompleted: true });
    }
  };

  const skipGuideStep = () => {
    if (guideStep === null) return;
    if (guideStep >= guideSteps.length - 1) {
      completeGuide();
      return;
    }
    setGuideStep(guideStep + 1);
  };

  const nextGuideStep = () => {
    if (guideStep === null) return;
    if (guideMode !== "static" && !getGuideCompletion(board, guideStep)) return;
    if (guideStep >= guideSteps.length - 1) {
      completeGuide();
      return;
    }
    setGuideStep(guideStep + 1);
  };

  useEffect(() => {
    if (!board || guideStep === null) return;
    const stepKey = guideSteps[guideStep]?.key;
    if (["winner", "logTools", "close", "share"].includes(stepKey)) return;
    if (guideMode === "static" || !getGuideCompletion(board, guideStep)) return;
    const timer = window.setTimeout(() => {
      if (guideStep >= guideSteps.length - 1) {
        completeGuide();
        return;
      }
      setGuideStep(guideStep + 1);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [board, guideStep, id]);

  if (loading) return <Loading />;
  if (missing) return <NotFound id={id} />;

  const shareUrl = window.location.href;
  const guidePainPoint = board.painPoints[0];
  const canAdvanceGuide = getGuideCompletion(board, guideStep);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="brand-row compact">
            <div className="brand-mark">
              <Map size={18} />
            </div>
          <span>Mapa de Compromisos</span>
          </div>
          <h1>{board.teamName}</h1>
          {board.description && <p>{board.description}</p>}
        </div>
        <div className="top-actions">
          <div className={`share-guide-actions ${guideSteps[guideStep]?.key === "share" ? "guide-highlight" : ""}`}>
            <button
              className="ghost-button"
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
              title="Copiar URL"
            >
              <LinkIcon size={17} />
              Compartir
            </button>
            <button
              className="ghost-button"
              onClick={() => {
                setGuideMode("interactive");
                setGuideStep(0);
              }}
              title="Ver guía"
            >
              <Sparkles size={17} />
              Guía
            </button>
          </div>
          <span className="save-state">
            <Check size={15} />
            {saveError ? "No guardado" : savedAt ? "Guardado" : "Listo"}
          </span>
        </div>
      </header>

      <PainPointComposer board={board} updateBoard={updateBoard} guideStep={guideSteps[guideStep]?.key} />
      <BoardStats board={board} />

      <section className="map-section">
        <div className="section-heading">
          <CircleDot size={18} />
          <h2>Mapa visual</h2>
        </div>
        {board.painPoints.length === 0 ? (
          <EmptyMap />
        ) : (
          <div className="map-list">
            {board.painPoints.map((painPoint) => (
              <MapFlow
                key={painPoint.id}
                board={board}
                painPoint={painPoint}
                updateBoard={updateBoard}
                guideStep={guideSteps[guideStep]?.key}
                guideFocusPainPointId={guidePainPoint?.id}
              />
            ))}
          </div>
        )}
      </section>
      {guideStep !== null && (
        <FlowGuide
          step={guideStep}
          total={guideSteps.length}
          data={guideSteps[guideStep]}
          canAdvance={canAdvanceGuide}
          mode={guideMode}
          onStaticMode={() => setGuideMode("static")}
          onNext={nextGuideStep}
          onSkipAll={completeGuide}
        />
      )}
    </main>
  );
}

function BoardStats({ board }) {
  const closedCommitments = board.commitments.filter((commitment) =>
    ["Completado", "Fallido"].includes(commitment.status)
  ).length;
  const activeCommitments = board.commitments.filter((commitment) =>
    ["Planificado", "Activo"].includes(commitment.status)
  ).length;
  const resolvedPainPoints = board.painPoints.filter((painPoint) =>
    ["Mitigado", "Resuelto"].includes(painPoint.status)
  ).length;
  const resolution =
    board.painPoints.length === 0
      ? 0
      : Math.round((resolvedPainPoints / board.painPoints.length) * 100);
  const stats = [
    ["Puntos de dolor", board.painPoints.length],
    ["Ideas generadas", board.ideas.length],
    ["Compromisos activos", activeCommitments],
    ["Compromisos cerrados", closedCommitments],
    ["Resolución", `${resolution}%`]
  ];

  return (
    <section className="board-stats" aria-label="Resumen del tablero">
      {stats.map(([label, value]) => (
        <div className="stat-item" key={label}>
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </section>
  );
}

function FlowGuide({ step, total, data, canAdvance, mode, onStaticMode, onNext, onSkipAll }) {
  const isLast = step === total - 1;
  const isStatic = mode === "static";
  const isInformational = ["winner", "logTools", "close", "share"].includes(data.key);
  const showPrimaryAction = isStatic || isInformational;
  const [cardPosition, setCardPosition] = useState(null);
  const cardRef = React.useRef(null);

  useEffect(() => {
    const target = document.querySelector(".guide-highlight");
    if (!target) return;

    const placeCard = () => {
      const rect = target.getBoundingClientRect();
      const gap = 18;
      const margin = 16;
      const width = Math.min(420, window.innerWidth - 32);
      const height = cardRef.current?.offsetHeight || 280;
      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
      const centeredLeft = clamp(rect.left + rect.width / 2 - width / 2, margin, window.innerWidth - width - margin);
      const centeredTop = clamp(rect.top + rect.height / 2 - height / 2, margin, window.innerHeight - height - margin);

      if (data.key === "share") {
        setCardPosition({
          top: clamp(rect.bottom + gap + 10, margin, window.innerHeight - height - margin),
          left: clamp(rect.right - width, margin, window.innerWidth - width - margin),
          width
        });
        return;
      }

      const positions = [
        {
          name: "below",
          top: rect.bottom + gap,
          left: centeredLeft,
          fits: rect.bottom + gap + height <= window.innerHeight - margin
        },
        {
          name: "above",
          top: rect.top - height - gap,
          left: centeredLeft,
          fits: rect.top - height - gap >= margin
        },
        {
          name: "right",
          top: centeredTop,
          left: rect.right + gap,
          fits: rect.right + gap + width <= window.innerWidth - margin
        },
        {
          name: "left",
          top: centeredTop,
          left: rect.left - width - gap,
          fits: rect.left - width - gap >= margin
        }
      ];
      const firstFit = positions.find((position) => position.fits);

      if (firstFit) {
        setCardPosition({ top: firstFit.top, left: firstFit.left, width });
        return;
      }

      const topSpace = rect.top - margin;
      const bottomSpace = window.innerHeight - rect.bottom - margin;
      const fallbackTop =
        bottomSpace >= topSpace
          ? clamp(rect.bottom + gap, margin, window.innerHeight - height - margin)
          : clamp(rect.top - height - gap, margin, window.innerHeight - height - margin);

      setCardPosition({
        top: fallbackTop,
        left: centeredLeft,
        width
      });
    };

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(placeCard, 260);
    window.addEventListener("resize", placeCard);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", placeCard);
    };
  }, [step, data.body, mode, showPrimaryAction]);

  return (
    <>
      <div className="flow-guide-backdrop" />
      <div
        className="flow-guide-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-guide-title"
        style={cardPosition || undefined}
        ref={cardRef}
      >
        <section className="flow-guide-card">
          <button className="icon-button tutorial-close" onClick={onSkipAll} aria-label="Saltar guía">
            <X size={18} />
          </button>
          <div className="tutorial-kicker">
            Paso {step + 1} de {total}
          </div>
          <h2 id="flow-guide-title">{data.title}</h2>
          <p>{data.body}</p>
          <div className="tutorial-dots" aria-hidden="true">
            {guideSteps.map((item, index) => (
              <span className={index === step ? "active" : ""} key={item.title} />
            ))}
          </div>
          <div className="tutorial-actions">
            <button className="guide-action-button" onClick={onSkipAll}>
              Saltar guía
            </button>
            {!isStatic && (
              <button className="guide-action-button" onClick={onStaticMode}>
                Cambiar a tutorial estático
              </button>
            )}
            {showPrimaryAction && (
              <button className="guide-action-button" onClick={onNext} disabled={!isStatic && !isInformational && !canAdvance}>
                {isLast ? "Terminar" : isInformational && !isStatic ? "Continuar" : "Siguiente"}
                {!isLast && <ChevronRight size={17} />}
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function PainPointComposer({ board, updateBoard, guideStep }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creatorName, setCreatorName] = useState("");

  const addPainPoint = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    updateBoard({
      ...board,
      painPoints: [
        {
          id: uid(),
          title: title.trim(),
          description: description.trim(),
          creatorName: creatorName.trim(),
          createdAt: new Date().toISOString(),
          votes: 0,
          status: "Abierto"
        },
        ...board.painPoints
      ]
    });
    setTitle("");
    setDescription("");
    setCreatorName("");
  };

  return (
    <section className={`composer ${guideStep === "pain" ? "guide-highlight" : ""}`}>
      <form onSubmit={addPainPoint}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Punto de dolor"
        />
        <input
          value={creatorName}
          onChange={(event) => setCreatorName(event.target.value)}
          placeholder="Quién propone"
        />
        <input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Contexto del punto de dolor"
        />
        <button className="primary-button">
          <Plus size={18} />
          Agregar punto de dolor
        </button>
      </form>
    </section>
  );
}

function MapFlow({ board, painPoint, updateBoard, guideStep, guideFocusPainPointId }) {
  const [expanded, setExpanded] = useState(true);
  const [focusedIdeaId, setFocusedIdeaId] = useState(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const votingRef = React.useRef(null);
  const isSolved = painPoint.status === "Resuelto";
  const isGuideTarget = guideFocusPainPointId === painPoint.id;
  const painPointToneClass =
    {
      Abierto: "pain-status-open",
      Mitigado: "pain-status-mitigated",
      Resuelto: "pain-status-solved",
      Replanificación: "pain-status-replanned"
    }[painPoint.status] || "pain-status-open";
  const votingClosed = painPoint.votingClosed || false;
  const painPointIdeas = board.ideas.filter((idea) => idea.painPointId === painPoint.id);
  const ideas = votingClosed
    ? [...painPointIdeas].sort((a, b) => ideaScore(b) - ideaScore(a))
    : painPointIdeas;
  const focusedIdea =
    ideas.find((idea) => idea.id === focusedIdeaId) || ideas[0] || null;
  const painPointCommitments = board.commitments.filter(
    (item) => item.painPointId === painPoint.id
  );
  const closedCommitments = painPointCommitments.filter((item) =>
    ["Completado", "Fallido"].includes(item.status)
  );
  const commitment = [...painPointCommitments]
    .reverse()
    .find((item) => !["Completado", "Fallido"].includes(item.status));
  const checkpoints = commitment
    ? board.checkpoints.filter((item) => item.commitmentId === commitment.id)
    : [];
  const outcome = commitment ? board.outcomes[commitment.id] : null;
  const shouldShowActiveLifecycle =
    commitment || closedCommitments.length === 0 || painPoint.status === "Replanificación";
  const daysRemaining = commitment?.targetDate
    ? Math.ceil(
        (new Date(`${commitment.targetDate}T00:00:00`) -
          new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`)) /
          86400000
      )
    : null;

  const openVoting = () => {
    setVotingOpen(true);
    window.setTimeout(() => {
      votingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const closeVoting = () => {
    const winningIdea = [...painPointIdeas].sort((a, b) => ideaScore(b) - ideaScore(a))[0];
    if (winningIdea) setFocusedIdeaId(winningIdea.id);
    updateBoard({
      ...board,
      painPoints: board.painPoints.map((item) =>
        item.id === painPoint.id ? { ...item, votingClosed: true } : item
      )
    });
    setVotingOpen(false);
  };

  const deletePainPoint = () => {
    const commitmentIds = painPointCommitments.map((item) => item.id);
    const nextOutcomes = Object.fromEntries(
      Object.entries(board.outcomes || {}).filter(([commitmentId]) => !commitmentIds.includes(commitmentId))
    );

    updateBoard({
      ...board,
      painPoints: board.painPoints.filter((item) => item.id !== painPoint.id),
      ideas: board.ideas.filter((item) => item.painPointId !== painPoint.id),
      commitments: board.commitments.filter((item) => item.painPointId !== painPoint.id),
      checkpoints: board.checkpoints.filter((item) => !commitmentIds.includes(item.commitmentId)),
      outcomes: nextOutcomes
    });
  };

  const deleteCommitment = () => {
    if (!commitment || ["Completado", "Fallido"].includes(commitment.status)) return;
    const nextOutcomes = Object.fromEntries(
      Object.entries(board.outcomes || {}).filter(([commitmentId]) => commitmentId !== commitment.id)
    );

    updateBoard({
      ...board,
      commitments: board.commitments.filter((item) => item.id !== commitment.id),
      checkpoints: board.checkpoints.filter((item) => item.commitmentId !== commitment.id),
      outcomes: nextOutcomes
    });
  };

  return (
    <article className={`concept-map ${painPointToneClass} ${expanded ? "expanded" : "collapsed"}`}>
      <div className="map-summary-shell">
        <button className="map-summary" type="button" onClick={() => setExpanded((current) => !current)}>
          <div className="summary-title">
            <CircleDot size={16} />
            <strong>{painPoint.title}</strong>
          </div>
          <div className="summary-meta">
            <span>{painPoint.status}</span>
            <span>{ideas.length} ideas</span>
            <span>
              {commitment
                ? commitment.status
                : closedCommitments.length > 0
                  ? `${closedCommitments.length} cerrados`
                  : "Sin compromiso"}
            </span>
            {daysRemaining !== null && <span>{Math.max(daysRemaining, 0)} días restantes</span>}
          </div>
        </button>
        <button
          className="summary-delete-button"
          type="button"
          onClick={() => setDeleteConfirmation("painPoint")}
          title="Eliminar punto de dolor"
          aria-label="Eliminar punto de dolor"
          data-tooltip="Eliminar"
        >
          <Trash2 size={14} />
        </button>
        <button
          className="summary-chevron-button"
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? "Comprimir punto de dolor" : "Desplegar punto de dolor"}
        >
          <ChevronDown className="summary-chevron" size={18} />
        </button>
      </div>

      {expanded && (
        <>
          <div className="concept-main-row">
            <FlowNode label="Punto de dolor" icon={<CircleDot size={16} />} compact>
              <PainPointCard board={board} painPoint={painPoint} updateBoard={updateBoard} />
            </FlowNode>
            <FlowNode
              label={isSolved ? "Idea ganadora" : "Ideas que se desprenden"}
              icon={<Lightbulb size={16} />}
              action={
                !isSolved && (
                  <button
                    className={`vote-start-button ${isGuideTarget && guideStep === "vote" ? "guide-highlight" : ""}`}
                    type="button"
                    disabled={ideas.length === 0 || votingOpen}
                    onClick={openVoting}
                  >
                    <ThumbsUp size={15} />
                    A votar
                  </button>
                )
              }
            >
              <IdeasPanel
                board={board}
                painPoint={painPoint}
                ideas={ideas}
                focusedIdeaId={focusedIdea?.id}
                onFocusIdea={setFocusedIdeaId}
                votingOpen={votingOpen}
                votingClosed={votingClosed}
                updateBoard={updateBoard}
                guideStep={isGuideTarget ? guideStep : null}
              />
            </FlowNode>
          </div>

          <IdeaVotingPanel
            board={board}
            ideas={ideas}
            open={votingOpen}
            votingRef={votingRef}
            onCloseVoting={closeVoting}
            updateBoard={updateBoard}
            guideStep={isGuideTarget ? guideStep : null}
          />

          {closedCommitments.map((closedCommitment) => (
            <ClosedCommitmentSummary
              key={closedCommitment.id}
              commitment={closedCommitment}
              checkpoints={board.checkpoints.filter(
                (item) => item.commitmentId === closedCommitment.id
              )}
              outcome={board.outcomes[closedCommitment.id]}
            />
          ))}

          {shouldShowActiveLifecycle && (
            <div className="concept-lifecycle">
              <FlowNode label={commitment ? "Compromiso" : "Nuevo compromiso"} icon={<ClipboardList size={16} />}>
                <CommitmentPanel
                  board={board}
                  painPoint={painPoint}
                  ideas={ideas}
                  commitment={commitment}
                  updateBoard={updateBoard}
                  onDeleteCommitment={() => setDeleteConfirmation("commitment")}
                  guideStep={isGuideTarget ? guideStep : null}
                />
              </FlowNode>
              <FlowNode label="Seguimiento" icon={<CalendarDays size={16} />}>
                <CheckpointPanel
                  board={board}
                  commitment={commitment}
                  checkpoints={checkpoints}
                  outcome={outcome}
                  updateBoard={updateBoard}
                  guideStep={isGuideTarget ? guideStep : null}
                />
              </FlowNode>
              <FlowNode label="Cierre" icon={<Sparkles size={16} />}>
                <OutcomePanel
                  board={board}
                  painPoint={painPoint}
                  commitment={commitment}
                  outcome={outcome}
                  updateBoard={updateBoard}
                  guideStep={isGuideTarget ? guideStep : null}
                />
              </FlowNode>
            </div>
          )}
        </>
      )}
      {deleteConfirmation === "painPoint" && (
        <ConfirmModal
          title="Eliminar punto de dolor"
          message="Se eliminarán también sus ideas, compromisos, logs y cierres asociados."
          confirmLabel="Eliminar punto"
          onCancel={() => setDeleteConfirmation(null)}
          onConfirm={() => {
            setDeleteConfirmation(null);
            deletePainPoint();
          }}
        />
      )}

      {deleteConfirmation === "commitment" && commitment && (
        <ConfirmModal
          title="Eliminar compromiso"
          message="Se eliminarán este compromiso y sus logs asociados. Los compromisos cerrados no se pueden eliminar desde acá."
          confirmLabel="Eliminar compromiso"
          onCancel={() => setDeleteConfirmation(null)}
          onConfirm={() => {
            setDeleteConfirmation(null);
            deleteCommitment();
          }}
        />
      )}
    </article>
  );
}

function ClosedCommitmentSummary({ commitment, checkpoints, outcome }) {
  const [open, setOpen] = useState(false);
  const smart = commitment.smart || {};
  const guardians = commitment.guardians || [];
  const timelineItems = buildTimelineItems(commitment, checkpoints, outcome);
  return (
    <section className={`closed-commitment-summary ${open ? "open" : ""}`}>
      <button type="button" className="closed-summary-header" onClick={() => setOpen((current) => !current)}>
        <div>
          <span>Cierre</span>
          <strong>{commitment.title}</strong>
        </div>
        <div className="closed-summary-meta">
          <span className={commitmentStatusClass(commitment.status)}>{commitment.status}</span>
          {outcome?.closedAt && <span>{formatDate(outcome.closedAt)}</span>}
        </div>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="closed-summary-body">
          <div className="closure-summary compact">
            <div>
              <span>Estado final</span>
              <strong className={commitmentStatusClass(commitment.status)}>{commitment.status}</strong>
            </div>
            <div>
              <span>Logs</span>
              <strong>{checkpoints.length}</strong>
            </div>
            {outcome?.reflection && <p>{outcome.reflection}</p>}
          </div>
          <div className="closed-detail-grid">
            <section className="closed-detail-section">
              <h3>Compromiso original</h3>
              <p>{commitment.description || "Sin descripción"}</p>
              <div className="closed-detail-pills">
                <span>Creación: {formatDate(commitment.createdAt || commitment.startDate) || "Sin fecha"}</span>
                <span>Inicio: {formatDate(commitment.startedAt) || "Sin iniciar"}</span>
                <span>Fin: {formatDate(commitment.targetDate) || "Sin fecha"}</span>
              </div>
              {guardians.length > 0 && (
                <div className="closed-guardian-list">
                  {guardians.map((guardian) => (
                    <span className="guardian-chip" title={guardian} key={guardian}>
                      <span>{guardian}</span>
                    </span>
                  ))}
                </div>
              )}
            </section>

            <section className="closed-detail-section">
              <h3>SMART</h3>
              <div className="closed-smart-grid">
                {smartFields.map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <p>{smart[key] || "Sin completar"}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="closed-detail-section">
              <h3>Timeline</h3>
              <Timeline items={timelineItems} />
            </section>

            <section className="closed-detail-section">
              <h3>Logs</h3>
              <div className="closed-log-list">
                {[...checkpoints].reverse().map((checkpoint) => (
                  <div className="checkpoint-card" key={checkpoint.id}>
                    <div className="log-card-title">
                      <strong>{checkpoint.summary || "Log sin resumen"}</strong>
                      <span>{formatDate(checkpoint.date)}</span>
                    </div>
                    {checkpoint.notes && <p>{checkpoint.notes}</p>}
                  </div>
                ))}
                {checkpoints.length === 0 && <p>Sin logs registrados.</p>}
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}

function FlowNode({ label, icon, action, compact, children }) {
  return (
    <section className={`flow-node ${compact ? "compact-node" : ""}`}>
      <div className="node-header">
        <div className="node-label">
          {icon}
          {label}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function PainPointCard({ board, painPoint, updateBoard }) {
  const patch = (changes) =>
    updateBoard({
      ...board,
      painPoints: board.painPoints.map((item) =>
        item.id === painPoint.id ? { ...item, ...changes } : item
      )
    });

  return (
    <div className="entity-card pain-card">
      <div className="card-title-row">
        <h3>{painPoint.title}</h3>
        <button className="vote-button" onClick={() => patch({ votes: painPoint.votes + 1 })}>
          <ThumbsUp size={15} />
          {painPoint.votes}
        </button>
      </div>
      {painPoint.description && <p>{painPoint.description}</p>}
      <div className="meta-row">
        {painPoint.creatorName && (
          <span>
            <UserRound size={14} />
            {painPoint.creatorName}
          </span>
        )}
        <select value={painPoint.status} onChange={(event) => patch({ status: event.target.value })}>
          {painPointStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function IdeasPanel({
  board,
  painPoint,
  ideas,
  focusedIdeaId,
  onFocusIdea,
  votingOpen,
  votingClosed,
  updateBoard,
  guideStep
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showOtherIdeas, setShowOtherIdeas] = useState(false);
  const isSolved = painPoint.status === "Resuelto";
  const leadingIdea = ideas[0] || null;
  const otherIdeas = ideas.slice(1);
  const visibleIdeas = votingClosed
    ? showOtherIdeas || !leadingIdea
      ? ideas
      : [leadingIdea]
    : ideas;

  useEffect(() => {
    if (!votingOpen) setShowOtherIdeas(false);
  }, [votingOpen]);

  const addIdea = (event) => {
    event.preventDefault();
    if (isSolved) return;
    if (!title.trim()) return;
    updateBoard({
      ...board,
      ideas: [
        ...board.ideas,
        {
          id: uid(),
          painPointId: painPoint.id,
          title: title.trim(),
          description: description.trim(),
          votes: 0,
          reactions: emptyReactions()
        }
      ]
    });
    setTitle("");
    setDescription("");
  };

  return (
    <div className="stack">
      {!isSolved && (
        <form className={`mini-form ${guideStep === "idea" ? "guide-highlight" : ""}`} onSubmit={addIdea}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Título de la idea. Ej: Cerrar cada reunión con acuerdos escritos"
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Detalle de la idea: qué haría distinto el equipo"
            rows={2}
          />
          <button className="secondary-button">
            <Plus size={16} />
            Guardar idea
          </button>
        </form>
      )}
      {visibleIdeas.map((idea, index) => {
        const isLeading = votingClosed && idea.id === leadingIdea?.id;
        const reactions = getReactions(idea);

        return (
        <div
          className={`idea-card ${votingClosed && idea.id === focusedIdeaId ? "selected" : ""} ${isLeading ? "leading" : ""} ${guideStep === "winner" && isLeading ? "guide-highlight" : ""}`}
          key={idea.id}
        >
          <div className="card-title-row">
            <h3>{idea.title}</h3>
            {votingClosed && <span className="vote-count">{ideaScore(idea)} puntos</span>}
          </div>
          {idea.description && <p>{idea.description}</p>}
          {votingClosed && (
            <div className="idea-actions">
              {isLeading && <span className="leader-pill">Idea más votada</span>}
              <span className="reaction-summary">
                <ThumbsUp size={14} /> {reactions.up}
                <ThumbsDown size={14} /> {reactions.down}
                <Hand size={14} /> {reactions.fist}
              </span>
            </div>
          )}
        </div>
      )})}
      {votingClosed && otherIdeas.length > 0 && (
        <button
          className="secondary-button other-ideas-toggle"
          type="button"
          onClick={() =>
            setShowOtherIdeas((current) => {
              if (current && leadingIdea) onFocusIdea(leadingIdea.id);
              return !current;
            })
          }
        >
          {showOtherIdeas ? "Ocultar otras ideas" : `Ver otras ideas (${otherIdeas.length})`}
        </button>
      )}
    </div>
  );
}

function IdeaVotingPanel({ board, ideas, open, votingRef, onCloseVoting, updateBoard, guideStep }) {
  const voteKey = (ideaId) => `voto-idea:${board.id}:${ideaId}`;

  const currentReaction = (ideaId) => localStorage.getItem(voteKey(ideaId));

  const toggleReaction = (idea, reaction) => {
    const previous = currentReaction(idea.id);
    const nextReaction = previous === reaction ? null : reaction;

    if (nextReaction) {
      localStorage.setItem(voteKey(idea.id), nextReaction);
    } else {
      localStorage.removeItem(voteKey(idea.id));
    }

    updateBoard({
      ...board,
      ideas: board.ideas.map((item) => {
        if (item.id !== idea.id) return item;
        const reactions = getReactions(item);
        if (previous) reactions[previous] = Math.max(0, reactions[previous] - 1);
        if (nextReaction) reactions[nextReaction] += 1;
        return {
          ...item,
          reactions,
          votes: reactions.up
        };
      })
    });
  };

  if (!open) return null;

  return (
    <section className={`idea-voting-panel ${guideStep === "vote" ? "guide-highlight" : ""}`} ref={votingRef}>
      <div className="voting-header">
        <div>
          <div className="node-label">
            <ThumbsUp size={16} />
            Votación abierta
          </div>
          <h3>Todas las ideas</h3>
        </div>
        <button className="secondary-button" type="button" onClick={onCloseVoting}>
          Cerrar votación
        </button>
      </div>
      <div className="voting-grid">
        {ideas.map((idea) => {
          const reactions = getReactions(idea);
          const selected = currentReaction(idea.id);

          return (
            <article className="voting-idea-card" key={idea.id}>
              <div>
                <h3>{idea.title}</h3>
                {idea.description && <p>{idea.description}</p>}
              </div>
              <div className="reaction-buttons">
                <button
                  className={selected === "up" ? "active" : ""}
                  type="button"
                  onClick={() => toggleReaction(idea, "up")}
                  title="Voto a favor"
                >
                  <ThumbsUp size={18} />
                  <span>{reactions.up}</span>
                </button>
                <button
                  className={selected === "down" ? "active" : ""}
                  type="button"
                  onClick={() => toggleReaction(idea, "down")}
                  title="Voto en contra"
                >
                  <ThumbsDown size={18} />
                  <span>{reactions.down}</span>
                </button>
                <button
                  className={selected === "fist" ? "active" : ""}
                  type="button"
                  onClick={() => toggleReaction(idea, "fist")}
                  title="Apoyo fuerte"
                >
                  <Hand size={18} />
                  <span>{reactions.fist}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CommitmentPanel({
  board,
  painPoint,
  ideas,
  commitment,
  updateBoard,
  onDeleteCommitment,
  guideStep
}) {
  const leadingIdea = ideas[0];
  const [guardianInput, setGuardianInput] = useState("");
  const [showVoteAlert, setShowVoteAlert] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const canCreateCommitment = painPoint.votingClosed && leadingIdea;

  const createCommitment = () => {
    if (!canCreateCommitment) {
      setShowVoteAlert(true);
      return;
    }

    const source = leadingIdea;
    updateBoard({
      ...board,
      commitments: [
        ...board.commitments,
        {
          id: uid(),
          painPointId: painPoint.id,
          title: source.title,
          description: source.description || "",
          createdAt: new Date().toISOString().slice(0, 10),
          owner: "",
          guardians: [],
          startDate: new Date().toISOString().slice(0, 10),
          targetDate: "",
          status: "Planificado",
          smart: {
            specific: "",
            measurable: "",
            achievable: "",
            relevant: ""
          }
        }
      ]
    });
  };

  const patch = (changes) =>
    updateBoard({
      ...board,
      commitments: board.commitments.map((item) =>
        item.id === commitment.id ? { ...item, ...changes } : item
      )
    });

  if (!commitment) {
    return (
      <div className={`placeholder-box ${guideStep === "commitment" ? "guide-highlight" : ""}`}>
        <p>{leadingIdea ? "La idea líder está lista para decidirse." : "Agregá ideas antes de decidir."}</p>
        <button className="secondary-button" onClick={createCommitment}>
          <Check size={16} />
          Crear compromiso
        </button>
        {showVoteAlert && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="vote-alert-title">
            <section className="action-alert-modal">
              <div>
                <h2 id="vote-alert-title">Primero voten una idea</h2>
                <p>Para generar un compromiso, cierren una votación y elijan la idea que va a avanzar.</p>
              </div>
              <button className="primary-button" type="button" onClick={() => setShowVoteAlert(false)}>
                Entendido
              </button>
            </section>
          </div>
        )}
      </div>
    );
  }

  const smart = commitment.smart || {};
  const smartComplete = smartFields.every(([key]) => (smart[key] || "").trim());
  const readyToStart = smartComplete && Boolean(commitment.targetDate);
  const guardians = commitment.guardians || [];
  const isStarted = commitment.status !== "Planificado";
  const isLocked = isStarted && !editMode;
  const addGuardians = (rawValue) => {
    if (isLocked) return;
    const nextGuardians = rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !guardians.includes(item));
    if (nextGuardians.length === 0) return;
    patch({ guardians: [...guardians, ...nextGuardians] });
    setGuardianInput("");
  };
  const removeGuardian = (guardian) =>
    !isLocked &&
    patch({ guardians: guardians.filter((item) => item !== guardian) });
  const startCommitment = () => {
    if (!readyToStart) return;
    const today = new Date().toISOString().slice(0, 10);
    patch({
      status: "Activo",
      startedAt: today,
      startDate: commitment.startDate || today
    });
    setEditMode(false);
  };

  return (
    <div className={`commitment-card ${isLocked ? "readonly" : ""} ${guideStep === "smart" || guideStep === "start" ? "guide-highlight" : ""}`}>
      <div className="commitment-toolbar">
        {isStarted && (
          <button
            className="subtle-icon-button"
            type="button"
            onClick={() => setConfirmEdit(true)}
            title="Editar compromiso"
            aria-label="Editar compromiso"
            data-tooltip="Editar"
          >
            <Pencil size={14} />
          </button>
        )}
        {!["Completado", "Fallido"].includes(commitment.status) && (
          <button
            className="subtle-icon-button"
            type="button"
            onClick={onDeleteCommitment}
            title="Eliminar compromiso"
            aria-label="Eliminar compromiso"
            data-tooltip="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="commitment-title-row">
        <input
          className="title-input"
          value={commitment.title}
          readOnly={isLocked}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </div>
      <textarea
        value={commitment.description}
        readOnly={isLocked}
        onChange={(event) => patch({ description: event.target.value })}
        rows={2}
      />
      <div className="field-grid">
        <label className="full-field">
          Guardianes
          <div className="guardian-editor">
            {guardians.map((guardian) => (
              <span className="guardian-chip" title={guardian} key={guardian}>
                <span>{guardian}</span>
                {!isLocked && (
                  <button type="button" onClick={() => removeGuardian(guardian)} aria-label={`Quitar ${guardian}`}>
                    <X size={13} />
                  </button>
                )}
              </span>
            ))}
            {!isLocked && (
              <input
                value={guardianInput}
                onChange={(event) => setGuardianInput(event.target.value)}
                onBlur={() => addGuardians(guardianInput)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addGuardians(guardianInput);
                  }
                }}
                placeholder="Agregar guardián"
              />
            )}
          </div>
        </label>
        <label>
          Estado
          <select
            value={commitment.status}
            disabled={isLocked}
            onChange={(event) => patch({ status: event.target.value })}
          >
            {commitmentStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          Inicio
          <input
            type="date"
            value={commitment.startDate}
            disabled={isLocked}
            onChange={(event) => patch({ startDate: event.target.value })}
          />
        </label>
        <label>
          Fecha de fin
          <input
            type="date"
            value={commitment.targetDate}
            disabled={isLocked}
            onChange={(event) => patch({ targetDate: event.target.value })}
          />
        </label>
      </div>
      <div className="smart-grid">
        {smartFields.map(([key, label]) => (
          <label key={key}>
            <span>{label}</span>
            <textarea
              value={smart[key] || ""}
              readOnly={isLocked}
              onChange={(event) => patch({ smart: { ...smart, [key]: event.target.value } })}
              rows={2}
            />
          </label>
        ))}
      </div>
      <button
        className="start-commitment-button"
        type="button"
        disabled={!readyToStart || commitment.status !== "Planificado"}
        onClick={startCommitment}
      >
        <Check size={16} />
        {commitment.status === "Planificado" ? "Iniciar compromiso" : "Compromiso iniciado"}
      </button>
      {!readyToStart && (
        <p className="form-hint">Completá los cuatro campos SMART y definí una fecha de fin para iniciar.</p>
      )}
      {editMode && isStarted && (
        <button className="secondary-button" type="button" onClick={() => setEditMode(false)}>
          Guardar edición
        </button>
      )}
      {confirmEdit && (
        <ConfirmModal
          title="Editar compromiso"
          message="Este compromiso ya fue iniciado. Confirmá que querés habilitar la edición manual."
          confirmLabel="Editar"
          tone="neutral"
          icon={<Pencil size={16} />}
          onCancel={() => setConfirmEdit(false)}
          onConfirm={() => {
            setConfirmEdit(false);
            setEditMode(true);
          }}
        />
      )}
    </div>
  );
}

function CheckpointPanel({ board, commitment, checkpoints, outcome, updateBoard, guideStep }) {
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingSummary, setEditingSummary] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [showAllLogs, setShowAllLogs] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const orderedCheckpoints = [...checkpoints].reverse();
  const visibleCheckpoints = orderedCheckpoints.slice(0, 3);
  const hasMoreLogs = orderedCheckpoints.length > 3;
  const daysRemaining = commitment?.targetDate
    ? Math.ceil(
        (new Date(`${commitment.targetDate}T00:00:00`) -
          new Date(`${today}T00:00:00`)) /
          86400000
      )
    : null;
  const timelineItems = buildTimelineItems(commitment, checkpoints, outcome);

  const addCheckpoint = (event) => {
    event.preventDefault();
    if (!commitment || !summary.trim()) return;
    updateBoard({
      ...board,
      checkpoints: [
        ...board.checkpoints,
        {
          id: uid(),
          commitmentId: commitment.id,
          date: today,
          summary: summary.trim(),
          notes: notes.trim()
        }
      ]
    });
    setSummary("");
    setNotes("");
  };

  const deleteCheckpoint = (checkpointId) => {
    const confirmed = window.confirm("¿Eliminar este log?");
    if (!confirmed) return;
    updateBoard({
      ...board,
      checkpoints: board.checkpoints.filter((checkpoint) => checkpoint.id !== checkpointId)
    });
  };

  const startEditing = (checkpoint) => {
    setEditingId(checkpoint.id);
    setEditingSummary(checkpoint.summary || "");
    setEditingNotes(checkpoint.notes || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingSummary("");
    setEditingNotes("");
  };

  const saveEditing = () => {
    updateBoard({
      ...board,
      checkpoints: board.checkpoints.map((checkpoint) =>
        checkpoint.id === editingId
          ? { ...checkpoint, summary: editingSummary.trim(), notes: editingNotes.trim() }
          : checkpoint
      )
    });
    cancelEditing();
  };

  if (!commitment) return <div className="placeholder-box">Sin compromiso elegido.</div>;

  return (
    <div className="tracking-panel">
      <section className="countdown-box">
        <strong>
          {daysRemaining === null
            ? "Sin fecha objetivo"
            : `${Math.max(daysRemaining, 0)} días restantes`}
        </strong>
        {commitment.targetDate && <span>Hasta {formatDate(commitment.targetDate)}</span>}
      </section>

      <form className={`log-form ${guideStep === "log" ? "guide-highlight" : ""}`} onSubmit={addCheckpoint}>
        <div className="log-heading">
          <h3>Log</h3>
          <span>{formatDate(today)}</span>
        </div>
        <input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Resumen del log"
        />
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Notas del avance: qué cambió, qué falta o qué aprendieron"
          rows={2}
        />
        <button className="secondary-button">
          <Plus size={16} />
          Registrar log
        </button>
      </form>

      <Timeline items={timelineItems} />

      <div className="log-list">
        {visibleCheckpoints.map((checkpoint, index) => (
          <LogCard
            key={checkpoint.id}
            checkpoint={checkpoint}
            editingId={editingId}
            editingSummary={editingSummary}
            editingNotes={editingNotes}
            setEditingSummary={setEditingSummary}
            setEditingNotes={setEditingNotes}
            startEditing={startEditing}
            deleteCheckpoint={deleteCheckpoint}
            cancelEditing={cancelEditing}
            saveEditing={saveEditing}
            guideStep={index === 0 ? guideStep : null}
          />
        ))}
        {hasMoreLogs && (
          <button className="view-logs-button" type="button" onClick={() => setShowAllLogs(true)}>
            Ver todos los logs
          </button>
        )}
      </div>
      {showAllLogs && (
        <LogsModal
          checkpoints={orderedCheckpoints}
          editingId={editingId}
          editingSummary={editingSummary}
          editingNotes={editingNotes}
          setEditingSummary={setEditingSummary}
          setEditingNotes={setEditingNotes}
          startEditing={startEditing}
          deleteCheckpoint={deleteCheckpoint}
          cancelEditing={cancelEditing}
          saveEditing={saveEditing}
          onClose={() => setShowAllLogs(false)}
          guideStep={guideStep}
        />
      )}
    </div>
  );
}

function Timeline({ items }) {
  return (
    <ol className="timeline" aria-label="Timeline de seguimiento">
      {items.map((item) => (
        <li key={item.id}>
          <span className="timeline-dot" />
          <div>
            <strong>{item.label}</strong>
            {item.date && <span>{formatDate(item.date)}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function LogCard({
  checkpoint,
  editingId,
  editingSummary,
  editingNotes,
  setEditingSummary,
  setEditingNotes,
  startEditing,
  deleteCheckpoint,
  cancelEditing,
  saveEditing,
  guideStep
}) {
  return (
    <div className="checkpoint-card">
      <div className="checkpoint-header">
        <div className="log-card-title">
          <strong>{checkpoint.summary || "Log sin resumen"}</strong>
          <span>{formatDate(checkpoint.date)}</span>
        </div>
        <div className={`checkpoint-actions ${guideStep === "logTools" ? "guide-highlight" : ""}`}>
          <button type="button" onClick={() => startEditing(checkpoint)} title="Editar log">
            <Pencil size={15} />
          </button>
          <button type="button" onClick={() => deleteCheckpoint(checkpoint.id)} title="Eliminar log">
            <Trash2 size={15} />
          </button>
        </div>
      </div>
      {editingId === checkpoint.id ? (
        <div className="log-edit-form">
          <input
            value={editingSummary}
            onChange={(event) => setEditingSummary(event.target.value)}
            placeholder="Resumen del log"
          />
          <textarea
            value={editingNotes}
            onChange={(event) => setEditingNotes(event.target.value)}
            rows={2}
          />
          <div className="log-edit-actions">
            <button className="secondary-button" type="button" onClick={cancelEditing}>
              Cancelar
            </button>
            <button className="primary-button" type="button" onClick={saveEditing}>
              Guardar
            </button>
          </div>
        </div>
      ) : (
        checkpoint.notes && <p>{checkpoint.notes}</p>
      )}
    </div>
  );
}

function LogsModal({
  checkpoints,
  editingId,
  editingSummary,
  editingNotes,
  setEditingSummary,
  setEditingNotes,
  startEditing,
  deleteCheckpoint,
  cancelEditing,
  saveEditing,
  onClose,
  guideStep
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="logs-title">
      <section className="logs-modal">
        <div className="modal-header">
          <h2 id="logs-title">Todos los logs</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar logs">
            <X size={18} />
          </button>
        </div>
        <div className="modal-log-list">
          {checkpoints.map((checkpoint, index) => (
            <LogCard
              key={checkpoint.id}
              checkpoint={checkpoint}
              editingId={editingId}
              editingSummary={editingSummary}
              editingNotes={editingNotes}
              setEditingSummary={setEditingSummary}
              setEditingNotes={setEditingNotes}
              startEditing={startEditing}
              deleteCheckpoint={deleteCheckpoint}
              cancelEditing={cancelEditing}
              saveEditing={saveEditing}
              guideStep={index === 0 ? guideStep : null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ConfirmModal({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
  tone = "danger",
  icon = <Trash2 size={16} />
}) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <section className="action-alert-modal">
        <div>
          <h2 id="confirm-title">{title}</h2>
          <p>{message}</p>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className={tone === "danger" ? "danger-button" : "primary-button"} type="button" onClick={onConfirm}>
            {icon}
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function OutcomePanel({ board, painPoint, commitment, outcome, updateBoard, guideStep }) {
  if (!commitment) return <div className="placeholder-box">El cierre aparece al crear un compromiso.</div>;

  const current = outcome || {
    commitmentCloseStatus: "",
    painPointCloseStatus: "",
    reflection: ""
  };
  const patch = (changes) =>
    updateBoard({
      ...board,
      outcomes: {
        ...board.outcomes,
        [commitment.id]: { ...current, ...changes }
      }
    });

  const closeCommitment = () => {
    if (!current.commitmentCloseStatus || !current.painPointCloseStatus) return;
    const closedAt = new Date().toISOString().slice(0, 10);
    const nextPainPointStatus =
      current.painPointCloseStatus === "Replanificar"
        ? "Replanificación"
        : current.painPointCloseStatus;

    updateBoard({
      ...board,
      commitments: board.commitments.map((item) =>
        item.id === commitment.id
          ? { ...item, status: current.commitmentCloseStatus }
          : item
      ),
      painPoints: board.painPoints.map((item) =>
        item.id === painPoint.id ? { ...item, status: nextPainPointStatus } : item
      ),
      outcomes: {
        ...board.outcomes,
        [commitment.id]: { ...current, closedAt }
      }
    });
  };
  const isClosed = ["Completado", "Fallido"].includes(commitment.status);

  return (
    <div className={`outcome-card ${guideStep === "close" ? "guide-highlight" : ""}`}>
      {isClosed && (
        <section className="closure-summary">
          <div>
            <span>Estado final</span>
            <strong className={commitmentStatusClass(commitment.status)}>{commitment.status}</strong>
          </div>
          <div>
            <span>Fecha de cierre</span>
            <strong>{formatDate(current.closedAt) || "Sin fecha"}</strong>
          </div>
          {current.reflection && <p>{current.reflection}</p>}
        </section>
      )}

      <section className="closure-group">
        <span>¿Cómo cerró este compromiso?</span>
        <div className="segmented-options">
          {["Completado", "Fallido"].map((status) => (
            <button
              className={current.commitmentCloseStatus === status ? "active" : ""}
              type="button"
              key={status}
              onClick={() => patch({ commitmentCloseStatus: status })}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      <section className="closure-group">
        <span>¿Qué pasó con el punto de dolor?</span>
        <div className="segmented-options">
          {["Mitigado", "Resuelto", "Replanificar"].map((status) => (
            <button
              className={current.painPointCloseStatus === status ? "active" : ""}
              type="button"
              key={status}
              onClick={() => patch({ painPointCloseStatus: status })}
            >
              {status}
            </button>
          ))}
        </div>
      </section>

      <label>
        Anotaciones
        <textarea
          value={current.reflection || ""}
          onChange={(event) => patch({ reflection: event.target.value })}
          rows={2}
        />
      </label>

      <button
        className="primary-button close-commitment-button"
        type="button"
        disabled={!current.commitmentCloseStatus || !current.painPointCloseStatus}
        onClick={closeCommitment}
      >
        <Check size={16} />
        Cerrar compromiso
      </button>
    </div>
  );
}

function EmptyMap() {
  return (
    <div className="empty-map">
      <CircleDot size={22} />
      <h2>El mapa empieza con un punto de dolor.</h2>
      <p>Después aparecen ideas, una decisión, seguimientos y cierre conectados en una sola línea.</p>
    </div>
  );
}

function Loading() {
  return <main className="status-screen">Cargando tablero...</main>;
}

function NotFound({ id }) {
  return (
    <main className="status-screen">
      <h1>Tablero no encontrado</h1>
      <p>No existe un tablero guardado para <strong>{id}</strong>.</p>
      <a href="/">Crear uno nuevo</a>
    </main>
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  const route = useMemo(() => {
    const match = path.match(/^\/(?:tablero|board)\/([^/]+)/);
    return match ? { boardId: match[1] } : {};
  }, [path]);

  return route.boardId ? <BoardPage id={route.boardId} /> : <Home />;
}

createRoot(document.getElementById("root")).render(<App />);
