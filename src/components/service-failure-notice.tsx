type ServiceFailureNoticeProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function ServiceFailureNotice({
  title,
  message,
  actionLabel,
  onAction,
}: ServiceFailureNoticeProps) {
  return (
    <div className="service-failure-notice" role="alert">
      <div>
        <p className="eyebrow">{title}</p>
        <p>{message}</p>
      </div>
      {actionLabel && onAction ? (
        <button className="button ghost" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
