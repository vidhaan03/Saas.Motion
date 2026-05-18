// The "motion.saas" wordmark — italic Fraunces serif "motion" + sans bold
// ".saas". Used in the pill nav AND the welcome hero (just at different
// sizes). One source of truth for the brand mark.

type Props = {
  size?: number; // px font-size; defaults to nav-pill size
  className?: string;
};

export const MotionLogotype = ({ size = 16, className }: Props) => (
  <span
    className={className}
    style={{ color: "var(--ink)", fontSize: size, lineHeight: 1 }}
  >
    <span
      className="italic"
      style={{
        fontFamily: "var(--font-serif), serif",
        fontWeight: 500,
      }}
    >
      motion
    </span>
    <span style={{ fontWeight: 600 }}>.saas</span>
  </span>
);
