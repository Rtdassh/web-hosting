import React from 'react';

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  style = {},
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded-md h-3.5 my-1';
      case 'card':
        return 'rounded-[20px] p-5';
      case 'rectangular':
      default:
        return 'rounded-xl';
    }
  };

  const combinedStyles = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  };

  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer ${getVariantStyles()} ${className}`}
      style={combinedStyles}
      {...props}
    />
  );
}

/**
 * SkeletonInstanceCard: Skeleton específico para simular una tarjeta de proyecto/instancia
 */
export function SkeletonInstanceCard() {
  return (
    <div className="p-6 border-b border-[#edf1ef] animate-pulse">
      <div className="flex flex-col xl:flex-row xl:items-center gap-5">
        <div className="flex items-center gap-3.5 xl:w-[23%]">
          <Skeleton variant="rectangular" className="w-12 h-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton variant="text" className="w-28 h-4" />
            <Skeleton variant="text" className="w-20 h-3" />
          </div>
        </div>

        <div className="xl:w-[13%]">
          <Skeleton variant="rectangular" className="w-20 h-6 rounded-full" />
        </div>

        <div className="xl:w-[9%] space-y-1">
          <Skeleton variant="text" className="w-10 h-2.5" />
          <Skeleton variant="text" className="w-12 h-4 font-mono" />
        </div>

        <div className="flex-1 space-y-1">
          <Skeleton variant="text" className="w-16 h-2.5" />
          <Skeleton variant="text" className="w-48 h-4" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton variant="rectangular" className="w-16 h-8 rounded-lg" />
          <Skeleton variant="rectangular" className="w-16 h-8 rounded-lg" />
          <Skeleton variant="rectangular" className="w-14 h-8 rounded-lg" />
          <Skeleton variant="rectangular" className="w-8 h-8 rounded-lg" />
        </div>
      </div>

      <div className="mt-4 p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-4">
        <Skeleton variant="text" className="w-32 h-3" />
        <Skeleton variant="text" className="w-48 h-3" />
      </div>
    </div>
  );
}

/**
 * SkeletonTableRow: Skeleton para tablas de datos (facturas, gobernanza)
 */
export function SkeletonTableRow({ columns = 7 }) {
  return (
    <tr className="animate-pulse border-b border-[#edf1ef]">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton variant="text" className="w-3/4 h-3.5" />
        </td>
      ))}
    </tr>
  );
}

