
type Props = {
  message: string;
  type: 'success' | 'error';
};

const Toast = ({ message, type }: Props) => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';

  return (
    <div className={`fixed top-6 right-6 z-50 px-6 py-4 text-lg rounded-xl ${bgColor} text-white shadow-lg opacity-0 animate-fadeInOut`}>
      {type === 'success' ? '✅' : '❌'} {message}
    </div>
  );
};

export default Toast;
