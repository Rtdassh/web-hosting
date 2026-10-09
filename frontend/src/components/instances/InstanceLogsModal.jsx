import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Terminal,
  X,
  RefreshCw,
  Copy,
  Check,
  ArrowDown,
  Loader2,
  AlertCircle,
  Server,
  Activity,
} from 'lucide-react';

import { instanceService } from '../../services/api';


export default function InstanceLogsModal({
  instance,
  onClose,
}) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filterStream, setFilterStream] = useState('all');

  const logContainerRef = useRef(null);


  /* =========================================================
     FETCH
  ========================================================= */

  const fetchLogs = async () => {
    if (!instance?.id) return;

    setLoading(true);
    setError('');

    try {
      const data = await instanceService.getLogs(
        instance.id,
        100
      );

      setLogs(data.lines || []);
    } catch (err) {
      console.error('Error al obtener logs:', err);

      setError(
        err.response?.data?.detail ||
        'No se pudieron recuperar los registros del contenedor.'
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchLogs();

    const interval = setInterval(() => {
      if (instance?.status === 'running') {
        fetchLogs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [instance?.id, instance?.status]);


  useEffect(() => {
    if (
      autoScroll &&
      logContainerRef.current
    ) {
      logContainerRef.current.scrollTop =
        logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);


  /* =========================================================
     COPY
  ========================================================= */

  const handleCopy = () => {
    if (!logs.length) return;

    navigator.clipboard.writeText(
      logs.join('\n')
    );

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };


  /* =========================================================
     FILTER
  ========================================================= */

  const filteredLogs = logs.filter((line) => {
    if (filterStream === 'error') {
      return (
        line.toLowerCase().includes('[error]') ||
        line.toLowerCase().includes('stderr') ||
        line.includes(' 404 ') ||
        line.includes(' 500 ')
      );
    }

    if (filterStream === 'access') {
      return !line
        .toLowerCase()
        .includes('[error]');
    }

    return true;
  });


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

      {/* Fondo */}
      <div
        className="absolute inset-0 bg-navy-900/60 backdrop-blur-[4px]"
        onClick={onClose}
      />


      {/* Modal */}
      <div className="relative w-full max-w-[980px] h-[650px] max-h-[88vh] rounded-[22px] border border-[#263d49] bg-[#101d27] shadow-[0_35px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col">


        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="px-5 sm:px-6 py-4 bg-[#172838] border-b border-white/10 flex items-center justify-between gap-4">


          <div className="flex items-center gap-3 min-w-0">

            <div className="w-10 h-10 rounded-[11px] bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">

              <Terminal className="w-4.5 h-4.5 text-brand-500" />

            </div>


            <div className="min-w-0">

              <div className="flex items-center gap-2 flex-wrap">

                <h3 className="text-[13px] sm:text-[14px] font-semibold text-white truncate">
                  Logs · {instance?.name}
                </h3>


                <span className="px-2 py-0.5 rounded-[6px] bg-white/5 border border-white/10 text-[9px] font-mono text-[#9fb2bd]">
                  PORT {instance?.assigned_port || '—'}
                </span>

              </div>


              <div className="mt-1 flex items-center gap-2">

                <Server className="w-3 h-3 text-[#647f8d]" />

                <p className="text-[10px] font-mono text-[#78909c] truncate">
                  {instance?.container_id
                    ? `Container ${instance.container_id.slice(0, 12)}`
                    : 'Container ID no disponible'}
                </p>

              </div>

            </div>

          </div>


          <div className="flex items-center gap-3">

            <div
              className={`
                hidden
                sm:inline-flex
                items-center
                gap-2
                px-2.5
                py-1
                rounded-full
                border
                ${
                  instance?.status === 'running'
                    ? 'bg-brand-500/10 border-brand-500/20 text-brand-500'
                    : 'bg-white/5 border-white/10 text-slate-400'
                }
              `}
            >

              <Activity className="w-3 h-3" />

              <span className="text-[9px] uppercase tracking-[0.12em] font-bold">
                {instance?.status === 'running'
                  ? 'En vivo'
                  : 'Detenido'}
              </span>

            </div>


            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[#78909c] hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

          </div>

        </div>


        {/* =====================================================
            TOOLBAR
        ====================================================== */}
        <div className="px-5 sm:px-6 py-3 bg-[#13222e] border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-3">


          {/* Filtros */}
          <div className="flex items-center gap-1 p-1 rounded-[9px] bg-[#0c1821] border border-white/[0.08]">

            <FilterButton
              active={filterStream === 'all'}
              onClick={() => setFilterStream('all')}
            >
              Todos ({logs.length})
            </FilterButton>


            <FilterButton
              active={filterStream === 'access'}
              onClick={() => setFilterStream('access')}
            >
              Access
            </FilterButton>


            <button
              type="button"
              onClick={() => setFilterStream('error')}
              className={`
                h-7
                px-3
                rounded-[6px]
                text-[10px]
                font-semibold
                transition-colors
                ${
                  filterStream === 'error'
                    ? 'bg-rose-500 text-white'
                    : 'text-[#78909c] hover:text-white hover:bg-white/5'
                }
              `}
            >
              Errores
            </button>

          </div>


          {/* Acciones */}
          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`
                h-8
                px-3
                rounded-[8px]
                border
                text-[10px]
                font-semibold
                flex
                items-center
                gap-1.5
                transition-colors
                ${
                  autoScroll
                    ? 'bg-brand-500/10 border-brand-500/25 text-brand-500'
                    : 'bg-white/5 border-white/10 text-[#78909c] hover:text-white'
                }
              `}
            >

              <ArrowDown className="w-3 h-3" />

              <span className="hidden sm:inline">
                Auto-scroll
              </span>

            </button>


            <button
              type="button"
              onClick={handleCopy}
              disabled={logs.length === 0}
              className="h-8 px-3 rounded-[8px] bg-white/5 hover:bg-white/10 border border-white/10 text-[#a8bbc4] hover:text-white text-[10px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >

              {copied ? (
                <Check className="w-3 h-3 text-brand-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}

              <span className="hidden sm:inline">
                {copied ? 'Copiado' : 'Copiar'}
              </span>

            </button>


            <button
              type="button"
              onClick={fetchLogs}
              disabled={loading}
              className="h-8 px-3 rounded-[8px] bg-white/5 hover:bg-white/10 border border-white/10 text-[#a8bbc4] hover:text-white text-[10px] font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >

              <RefreshCw
                className={`
                  w-3
                  h-3
                  ${loading ? 'animate-spin' : ''}
                `}
              />

              <span className="hidden sm:inline">
                Refrescar
              </span>

            </button>

          </div>

        </div>


        {/* =====================================================
            TERMINAL
        ====================================================== */}
        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto bg-[#08131b] px-4 sm:px-5 py-4 font-mono text-[11px] sm:text-[12px] leading-relaxed select-text scroll-smooth"
        >

          {loading && logs.length === 0 ? (

            <TerminalState>

              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />

              <p>
                Conectando con el contenedor...
              </p>

            </TerminalState>

          ) : error ? (

            <TerminalState>

              <AlertCircle className="w-6 h-6 text-rose-400" />

              <p className="text-rose-300">
                {error}
              </p>

            </TerminalState>

          ) : filteredLogs.length === 0 ? (

            <TerminalState>

              <Terminal className="w-6 h-6 text-[#415965]" />

              <div className="text-center">

                <p>
                  No hay registros en este stream.
                </p>

                <p className="mt-1 text-[10px] text-[#415965]">
                  Genera peticiones HTTP a tu sitio para observar la salida.
                </p>

              </div>

            </TerminalState>

          ) : (

            <div className="space-y-[2px]">

              {filteredLogs.map((line, idx) => {

                const isError =
                  line.toLowerCase().includes('[error]') ||
                  line.toLowerCase().includes('stderr') ||
                  line.includes(' 404 ') ||
                  line.includes(' 500 ');


                return (
                  <div
                    key={idx}
                    className="group flex items-start gap-3 rounded-[4px] px-1.5 py-[2px] hover:bg-white/[0.035]"
                  >

                    <span className="w-8 flex-shrink-0 text-right text-[9px] pt-[2px] text-[#314853] select-none">
                      {idx + 1}
                    </span>


                    <span
                      className={`
                        break-all
                        ${
                          isError
                            ? 'text-rose-300'
                            : 'text-[#83dcb8]'
                        }
                      `}
                    >
                      {line}
                    </span>

                  </div>
                );
              })}

            </div>

          )}

        </div>


        {/* =====================================================
            FOOTER
        ====================================================== */}
        <div className="px-5 sm:px-6 py-2.5 bg-[#0d1922] border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-[9px] text-[#506875]">

          <span>
            Últimas 100 líneas · Rotación 5 MB / 2 archivos
          </span>


          <span className="font-mono text-[#78909c]">
            {filteredLogs.length} líneas mostradas
          </span>

        </div>

      </div>

    </div>
  );
}


/* =========================================================
   FILTER BUTTON
========================================================= */

function FilterButton({
  active,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        h-7
        px-3
        rounded-[6px]
        text-[10px]
        font-semibold
        transition-colors
        ${
          active
            ? 'bg-brand-500 text-white'
            : 'text-[#78909c] hover:text-white hover:bg-white/5'
        }
      `}
    >
      {children}
    </button>
  );
}


/* =========================================================
   TERMINAL STATE
========================================================= */

function TerminalState({
  children,
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-[#5f7783] text-[11px]">
      {children}
    </div>
  );
}