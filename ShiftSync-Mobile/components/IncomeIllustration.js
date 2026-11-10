import ThreeIllustration from './ThreeIllustration';

export default function IncomeIllustration({ size = 132, animated = true, interactive = true }) {
  return <ThreeIllustration kind="income" size={size} animated={animated} interactive={interactive} />;
}
