const Modal = ({ children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 justify-center items-center  flex flex-col modalCont">
      <div className="bg-white p-6 rounded-lg shadow-lg relative w-96 max-w-full grid grid-cols-8 gap-4 modal-search">
        <button
          aria-label="Cerrar modal"
          className="absolute top-2 right-2 text-xl font-bold"
          onClick={onClose}
        >
          ✖
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
