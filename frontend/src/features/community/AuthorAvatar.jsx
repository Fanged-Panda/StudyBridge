const sizes = {
  sm: 'h-9 w-9 text-[11px]',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
};

const AuthorAvatar = ({ name = '', photo, size = 'md', className = '' }) => {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';

  return photo ? (
    <img
      src={photo}
      alt={`${name} profile photo`}
      loading="lazy"
      className={`${sizes[size]} shrink-0 rounded-full border border-slate-200 object-cover ${className}`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${sizes[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-secondary font-extrabold tracking-wide text-accent ${className}`}
    >
      {initials}
    </span>
  );
};

export default AuthorAvatar;
