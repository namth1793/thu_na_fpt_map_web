export default function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} border-3 border-gray-200 border-t-fpt-orange rounded-full animate-spin`}
      style={{ borderWidth: 3, borderTopColor: '#F05A22' }}
    />
  );
}
