export default function Card({ title, value, children, className = '' }) {
  return (
    <div className={`bg-white rounded shadow p-4 flex flex-col ${className}`}>
      <div className="text-gray-500 text-sm font-medium mb-1">{title}</div>
      <div className="text-2xl font-bold mb-2">{value}</div>
      {children}
    </div>
  );
}
