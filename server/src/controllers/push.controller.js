const webpush = require("web-push");
const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");

// Initialize web-push with VAPID keys from env
const initWebPush = () => {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:admin@example.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  }
};

initWebPush();

/**
 * @desc    Subscribe to push notifications
 * @route   POST /api/push/subscribe
 * @access  Private
 */
exports.subscribe = catchAsync(async (req, res) => {
  const subscription = req.body;

  // Add subscription to user model
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Avoid duplicate subscriptions
  const exists = user.pushSubscriptions?.some(
    (sub) => sub.endpoint === subscription.endpoint,
  );

  if (!exists) {
    if (!user.pushSubscriptions) user.pushSubscriptions = [];
    user.pushSubscriptions.push(subscription);
    await user.save({ validateModifiedOnly: true });
  }

  res.status(201).json({ success: true, message: "Subscribed successfully" });
});

/**
 * @desc    Unsubscribe from push notifications
 * @route   POST /api/push/unsubscribe
 * @access  Private
 */
exports.unsubscribe = catchAsync(async (req, res) => {
  const { endpoint } = req.body;

  const user = await User.findById(req.user.id);
  if (user && user.pushSubscriptions) {
    user.pushSubscriptions = user.pushSubscriptions.filter(
      (sub) => sub.endpoint !== endpoint,
    );
    await user.save({ validateModifiedOnly: true });
  }

  res.status(200).json({ success: true, message: "Unsubscribed successfully" });
});

/**
 * @desc    Get VAPID Public Key
 * @route   GET /api/push/vapid-public-key
 * @access  Public
 */
exports.getVapidPublicKey = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      publicKey: process.env.VAPID_PUBLIC_KEY,
    },
  });
});
