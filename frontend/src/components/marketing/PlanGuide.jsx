import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Card from '../ui/Card';

const options = [
  { id: 'personal', label: 'Un sitio personal', plan: 'Free', capacity: '1 sitio · 128 MB de memoria por sitio', description: 'Para empezar con tu portafolio o probar una idea sin costo.' },
  { id: 'clients', label: 'Hasta 3 proyectos', plan: 'Developer', capacity: '3 sitios · 256 MB de memoria por sitio', description: 'Más espacio para tus proyectos y los de tus clientes.' },
  { id: 'business', label: 'Hasta 10 proyectos', plan: 'Pro', capacity: '10 sitios · 512 MB de memoria por sitio', description: 'Para mantener varios proyectos de tu negocio en un mismo lugar.' },
];

export default function PlanGuide() {
  const [selected, setSelected] = useState(options[0]);
  return (
    <Card className="mt-10 max-w-4xl mx-auto" header="Encuentra tu punto de partida">
      <div className="grid gap-6 md:grid-cols-2 md:items-center">
        <fieldset>
          <legend className="text-sm font-semibold text-navy-900 mb-3">¿Cuántos sitios quieres publicar?</legend>
          <div className="flex flex-col gap-2">
            {options.map((option) => (
              <label key={option.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm cursor-pointer transition-colors ${selected.id === option.id ? 'bg-brand-50 border-brand-600 text-brand-700' : 'border-slate-200 hover:border-brand-600 text-slate-600'}`}>
                <input type="radio" name="hosting-goal" value={option.id} checked={selected.id === option.id}
                  onChange={() => setSelected(option)} className="brand-focus accent-brand-700 h-4 w-4" />
                {option.label}
                {selected.id === option.id && <Check aria-hidden="true" className="ml-auto w-4 h-4" />}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="rounded-xl bg-brand-50 p-5">
          <div role="status" aria-live="polite" aria-atomic="true">
            <p className="text-[10px] uppercase tracking-widest font-bold text-brand-700">Tu punto de partida</p>
            <p className="mt-2 text-2xl font-bold text-navy-900">{selected.plan}</p>
            <p className="mt-2 text-xs font-semibold text-brand-700">{selected.capacity}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{selected.description}</p>
          </div>
          <a href={`#landing-plan-${selected.plan.toLowerCase()}`} className="brand-focus btn-tactile mt-4 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-brand-700">
            Ver este plan <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </a>
        </div>
      </div>
    </Card>
  );
}
