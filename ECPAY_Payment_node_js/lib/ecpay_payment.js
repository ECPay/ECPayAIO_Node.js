/**
 * Created by ying.wu on 2017/6/9.
 */
const version = require('./ecpay_payment/version.js');
const payment_client = require('./ecpay_payment/payment_client.js');
const query_client = require('./ecpay_payment/query_client.js');
const exec_grant_refund = require('./ecpay_payment/exec_grant_refund.js');

class ECPayPayment {
    constructor(){
        this.version = new version();
        this.payment_client = new payment_client();
        this.query_client = new query_client();
        this.exec_grant_refund = new exec_grant_refund();
    }
}
module.exports = ECPayPayment;