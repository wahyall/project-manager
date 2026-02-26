/**
 * Wrapper untuk menangkap error di async route handlers
 * Menghindari try-catch berulang di setiap controller
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
