/**
 * Created by ying.wu on 2017/6/21.
 */
const helper = require('./helper.js');
const verify = require('./verification.js');
const ECpayError = require('./error.js');
const crypto = require('crypto');
const url = require('url');
const querystring = require('querystring');
const http = require('http');
const https = require('https');

class ECpayPaymentClient{
    constructor(options){
        this.helper = new helper(options);
        this.verify_aiochkout = new verify.AioCheckOutParamVerify();
    }

    aio_check_out_all(parameters, invoice={}){
        let unsupport = [];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'ALL');
        // handle Ignore Payment
        parameters['IgnorePayment'] = this.helper.get_ignore_pay().join('#');
        let html = this._aiochkout_pos_proc(parameters);
        return html;
    }
    aio_check_out_applepay(parameters, invoice={}){
        let unsupport = [];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'ApplePay');
        let html = this._aiochkout_pos_proc(parameters);
        return html;
    }
    aio_check_out_credit_onetime(parameters, invoice={}){
        let unsupport = [];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'Credit');
        let html = this._aiochkout_pos_proc(parameters);
        return html;
    }
    //<!--2019/09/30暫時關閉GooglePay付款方式-->
    /*aio_check_out_googlepay(parameters, invoice={}){
        let unsupport = [];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'GooglePay');
        let html = this._aiochkout_pos_proc(parameters);
        return html;
    }*/

    aio_check_out_credit_divide(parameters, invoice={}, installment){
        let unsupport = ['IgnorePayment', 'Redeem', 'PeriodAmount', 'PeriodType', 'Frequency', 'ExecTimes', 'PeriodReturnURL'];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'Credit');
        parameters['CreditInstallment'] = installment;
        let html = this._aiochkout_pos_proc(parameters);
        return html;
    }

    aio_check_out_credit_period(period_info, parameters, invoice={}){
        // 'PeriodAmount', 'PeriodType', 'Frequency', 'ExecTimes', 'PeriodReturnURL'
        let unsupport = ['IgnorePayment', 'Redeem', 'CreditInstallment', 'InstallmentAmount'];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'Credit');
        if (period_info.constructor === Object){
            let period_args = ['PeriodAmount', 'PeriodType', 'Frequency', 'ExecTimes', 'PeriodReturnURL'];
            period_args.sort().forEach(function (pname) {
                if (Object.keys(period_info).sort().indexOf(pname, 0) === -1){
                    throw new Error(`Credit card period parameters must be ${period_args}.`);
                }
            });
            Object.assign(parameters, period_info);
                // Add total amount protection!!!

            let html = this._aiochkout_pos_proc(parameters);
            return html;
        } else {
            throw new Error(`Received period_info argument must be a Object.`);
        }
    }

    aio_check_out_atm(parameters, url_return_payinfo = '', exp_period = '', client_redirect = '', invoice = {}){
        let unsupport = ['IgnorePayment'];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'ATM');
        if (exp_period === ''){
            delete parameters['ExpireDate'];
        } else {
            parameters['ExpireDate'] = exp_period;
        }
        if (client_redirect === ''){
            delete parameters['ClientRedirectURL'];
        } else {
            parameters['ClientRedirectURL'] = client_redirect;
        }
        if (url_return_payinfo === ''){
            delete parameters['PaymentInfoURL'];
        } else {
            parameters['PaymentInfoURL'] = url_return_payinfo;
        }
        let html = this._aiochkout_pos_proc(parameters);
        return html;
    }

    aio_check_out_webatm(parameters, invoice = {}){
        let unsupport = ['IgnorePayment'];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'WebATM');
        let html = this._aiochkout_pos_proc(parameters);
        return html;
    }

    aio_check_out_cvs(cvs_info, parameters, invoice = {}, client_redirect_url = ''){
        let unsupport = ['IgnorePayment'];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'CVS');
        if (cvs_info.constructor === Object){
            let cvs_args = ['StoreExpireDate', 'Desc_1', 'Desc_2', 'Desc_3', 'Desc_4', 'PaymentInfoURL'];
            cvs_args.sort().forEach(function (pname) {
                if (Object.keys(cvs_info).sort().indexOf(pname, 0) === -1){
                    throw new Error(`CVS info keys must match ${cvs_args}.`);
                }
            });

            Object.assign(parameters, cvs_info);
            if (client_redirect_url === '' || client_redirect_url === null){
                delete parameters['ClientRedirectURL'];
            } else {
                parameters['ClientRedirectURL'] = client_redirect_url;
            }
            let html = this._aiochkout_pos_proc(parameters);
            return html;
        } else {
            throw new Error(`Received cvs_info argument must be a Object.`);
        }
    }

    aio_check_out_barcode(barcode_info, parameters, invoice = {}, client_redirect_url = ''){
        let unsupport = ['IgnorePayment'];
        this._aiochkout_base_proc(parameters, invoice, unsupport, 'BARCODE');
        if (barcode_info.constructor === Object){
            let barcode_args = ['StoreExpireDate', 'Desc_1', 'Desc_2', 'Desc_3', 'Desc_4', 'PaymentInfoURL'];
            barcode_args.sort().forEach(function (pname) {
                if (Object.keys(barcode_info).sort().indexOf(pname, 0) === -1){
                    throw new Error(`BARCODE info keys must match ${barcode_args}.`);
                }
            });
            Object.assign(parameters, barcode_info);
            if (client_redirect_url === '' || client_redirect_url === null){
                delete parameters['ClientRedirectURL'];
            } else {
                parameters['ClientRedirectURL'] = client_redirect_url;
            }
            let html = this._aiochkout_pos_proc(parameters);
            return html;
        } else {
            throw new Error(`Received cvs_info argument must be a Object.`);
        }
    }

    _aiochkout_base_proc(params, inv, unsupport_param, pay_method){
        if (params.constructor === Object){
            // Remove  IgnorePayment
            if (unsupport_param.constructor === Array){
                unsupport_param.forEach(function (pa) {
                   delete params[pa];
                });
            } else {
                throw new Error(`argument unsupport_param must be an Array.`);
            }
            // User doesn't have to specify ChoosePayment
            params['ChoosePayment'] = pay_method;
            // Process PlatformID & MerchantID by contractor setting
            if (this.helper.is_contractor()){
                params['PlatformID'] = this.helper.get_mercid();
                if (params['MerchantID'] === null){
                    throw new Error(`[MerchantID] should be specified when you're contractor-Platform.`);
                }
            } else {
                params['PlatformID'] = '';
                params['MerchantID'] = this.helper.get_mercid();
            }
            // InvoiceMark based on keyword argument: invoice
            if (inv.constructor === Object && Object.keys(inv).length === 0){
                params['InvoiceMark'] = 'N';
            } else {
                params['InvoiceMark'] = 'Y';
                this.verify_aiochkout.verify_aio_inv_param(inv);
                // this.verify_aiochkout.AioCheckOutParamVerify().verify_aio_inv_param(inv);
                // merge param & inv param
                Object.assign(params, inv);
            }
        } else {
            throw new ECpayError.ECpayInvalidParam(`Received parameter object must be a Object.`);
        }
    }

    _aiochkout_pos_proc(params){
        this.verify_aiochkout.verify_aio_payment_param(params);
        // encode special param
        let sp_param = this.verify_aiochkout.get_special_encode_param('AioCheckOut');
        this.helper.encode_special_param(params, sp_param);

        // Insert chkmacval
        // console.log(params);
        let chkmac = this.helper.gen_chk_mac_value(params);
        params['CheckMacValue'] = chkmac;
        // gen post html
        let api_url = this.verify_aiochkout.get_svc_url('AioCheckOut', this.helper.get_op_mode());
        let htm = this.helper.gen_html_post_form(api_url, '_form_aiochk', params);
        //return post htm
        return htm;
    }
}
module.exports = ECpayPaymentClient;