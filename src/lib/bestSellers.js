const mongoose = require('mongoose');

let bestSellersCache = [];

async function updateBestSellers() {
    try {
        const Order = mongoose.model('Order');
        
        // Aggregate orders from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const topProducts = await Order.aggregate([
            { $match: { 
                createdAt: { $gte: thirtyDaysAgo },
                status: 'Delivered'
            }},
            { $unwind: '$products' },
            { $group: {
                _id: '$products.productId',
                totalSold: { $sum: '$products.quantity' },
                productName: { $first: '$products.productName' },
                productImages: { $first: '$products.productImage' }, // Changed field name to be consistent
                productPrice: { $first: '$products.productPrice' }
            }},
            { $sort: { totalSold: -1 } },
            { $limit: 6 }
        ]);

        bestSellersCache = topProducts;
    } catch (error) {
        console.error('Error updating best sellers:', error);
    }
}

// Update initially and then every 12 hours
updateBestSellers();
setInterval(updateBestSellers, 12 * 60 * 60 * 1000);

async function getBestSellers() {
    if (bestSellersCache.length < 6) {
        const Product = mongoose.model('Product');
        try {
            const fallbackProducts = await Product.aggregate([
                { $sample: { size: 6 } }
            ]);
            return fallbackProducts;
        } catch (error) {
            console.error('Error getting fallback products:', error);
            return [];
        }
    }
    return bestSellersCache;
}

module.exports = { getBestSellers };
