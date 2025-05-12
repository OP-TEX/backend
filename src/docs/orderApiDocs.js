/**
 * @api {get} /api/orders/:orderId Get Order by ID
 * @apiVersion 1.0.0
 * @apiName GetOrderById
 * @apiGroup Orders
 * @apiPermission authenticated
 *
 * @apiDescription Retrieve a specific order by its ID. This endpoint is accessible to all authenticated users,
 * but users can only access their own orders unless they have admin or delivery role.
 *
 * @apiHeader {String} Authorization Bearer token for user authentication
 *
 * @apiParam {String} orderId The unique identifier of the order
 *
 * @apiSuccess {Boolean} success Indicates if the request was successful
 * @apiSuccess {Object} order Order details
 * @apiSuccess {String} order.orderId Unique order identifier
 * @apiSuccess {String} order.status Current order status (Pending, Confirmed, Out for Delivery, Delivered, Cancelled)
 * @apiSuccess {Array} order.products List of products in the order
 * @apiSuccess {Number} order.totalPrice Total price of the order
 * @apiSuccess {String} order.deliveryId ID of the assigned delivery person (if any)
 * @apiSuccess {String} order.userId ID of the user who placed the order
 * @apiSuccess {Object} order.address Delivery address details
 * @apiSuccess {String} order.payment_method Payment method (cash_on_delivery, prepaid)
 * @apiSuccess {Date} order.createdAt Order creation timestamp
 * @apiSuccess {Date} order.updatedAt Order last update timestamp
 *
 * @apiError (404) {Object} NotFoundError Order with the specified ID was not found
 * @apiError (500) {Object} DatabaseError Error occurred while fetching the order
 *
 * @apiSuccessExample {json} Success Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "order": {
 *         "orderId": "16780923457623",
 *         "status": "Confirmed",
 *         "products": [
 *           {
 *             "productId": "60d21b4667d0d8992e610c85",
 *             "productName": "Sample Product",
 *             "productPrice": 29.99,
 *             "productImage": "https://example.com/images/product.jpg",
 *             "quantity": 2
 *           }
 *         ],
 *         "totalPrice": 59.98,
 *         "deliveryId": "60d21b4667d0d8992e610c86",
 *         "userId": "60d21b4667d0d8992e610c87",
 *         "address": {
 *           "street": "123 Main St",
 *           "Gover": "Cairo",
 *           "city": "Cairo",
 *           "building": "4",
 *           "floor": "2",
 *           "apartment": "201"
 *         },
 *         "payment_method": "cash_on_delivery",
 *         "createdAt": "2023-06-15T14:26:42.123Z",
 *         "updatedAt": "2023-06-15T14:26:42.123Z"
 *       }
 *     }
 *
 * @apiErrorExample {json} Error Response:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "success": false,
 *       "error": {
 *         "code": "ORDER_NOT_FOUND",
 *         "message": "Order not found"
 *       }
 *     }
 */
