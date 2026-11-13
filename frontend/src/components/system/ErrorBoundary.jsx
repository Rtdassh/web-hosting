import React from 'react';
import {
  AlertTriangle,
  Home,
  RefreshCw,
} from 'lucide-react';

import codropIsotipo from '../../assets/codrop-isotipo.png';


export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }


  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage:
        error?.message ||
        'Ocurrió un error inesperado en la aplicación.',
    };
  }


  componentDidCatch(error, errorInfo) {
    console.error(
      'Error no controlado capturado por Codrop:',
      error,
      errorInfo
    );
  }


  componentDidMount() {
    window.addEventListener(
      'error',
      this.handleGlobalError
    );

    window.addEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection
    );
  }


  componentWillUnmount() {
    window.removeEventListener(
      'error',
      this.handleGlobalError
    );

    window.removeEventListener(
      'unhandledrejection',
      this.handleUnhandledRejection
    );
  }


  handleGlobalError = (event) => {
    const message =
      event?.error?.message ||
      event?.message ||
      'Ocurrió un error inesperado.';

    console.error(
      'Error global capturado por Codrop:',
      event?.error || event
    );

    this.setState({
      hasError: true,
      errorMessage: message,
    });
  };


  handleUnhandledRejection = (event) => {
    const reason = event?.reason;

    const message =
      reason?.message ||
      (typeof reason === 'string'
        ? reason
        : 'Una operación no pudo completarse correctamente.');

    console.error(
      'Promesa no controlada capturada por Codrop:',
      reason
    );

    this.setState({
      hasError: true,
      errorMessage: message,
    });
  };


  handleRetry = () => {
    window.location.reload();
  };


  handleHome = () => {
    window.location.href = '/';
  };


  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f9f7] px-5 py-10">

        {/* Fondo */}
        <div className="pointer-events-none absolute inset-0">

          <div className="absolute left-1/2 top-[-180px] h-[380px] w-[620px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-[110px]" />

          <div className="absolute bottom-[-180px] right-[-100px] h-[400px] w-[400px] rounded-full bg-brand-50 blur-[100px]" />

        </div>


        <section className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[24px] border border-[#dfe7e4] bg-white shadow-[0_25px_70px_rgba(23,40,56,0.12)]">

          <div className="border-b border-red-100 bg-red-50/70 px-7 py-6">

            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] border border-red-200 bg-white">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>


              <div>

                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-500">
                  Error inesperado
                </p>

                <h1 className="mt-1 text-[22px] font-bold tracking-[-0.025em] text-navy-900">
                  Codrop encontró un problema
                </h1>

              </div>

            </div>

          </div>


          <div className="p-7">

            <p className="text-[13px] leading-6 text-[#64748b]">
              La aplicación encontró un error que no pudo resolver automáticamente.
              Puedes volver a intentar cargar la página sin perder tu cuenta.
            </p>


            <div className="mt-5 rounded-[12px] border border-[#e2e8f0] bg-[#f8faf9] px-4 py-3">

              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                Detalle
              </p>

              <p className="mt-1 break-words text-[11px] leading-5 text-[#64748b]">
                {this.state.errorMessage}
              </p>

            </div>


            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={this.handleRetry}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-brand-500 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(40,181,134,0.18)] transition hover:bg-brand-600 btn-tactile"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </button>


              <button
                type="button"
                onClick={this.handleHome}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#e2e8f0] bg-white text-[13px] font-semibold text-navy-900 transition hover:bg-[#f8faf9] btn-tactile"
              >
                <Home className="h-4 w-4" />
                Volver al inicio
              </button>

            </div>


            <div className="mt-6 flex items-center justify-between border-t border-[#eef2f1] pt-5">

              <div>

                <p className="text-[11px] font-semibold text-navy-900">
                  Tu sesión permanece protegida
                </p>

                <p className="mt-0.5 text-[10px] text-[#94a3b8]">
                  El error fue capturado antes de dejar la aplicación inutilizable.
                </p>

              </div>


              <img
                src={codropIsotipo}
                alt=""
                aria-hidden="true"
                className="hidden w-[85px] opacity-[0.16] sm:block"
              />

            </div>

          </div>

        </section>

      </main>
    );
  }
}