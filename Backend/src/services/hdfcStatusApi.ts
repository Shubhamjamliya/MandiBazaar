import axios from 'axios';
import { encrypt, decrypt } from '../utils/hdfcCrypto';
import url from 'url';

/**
 * HDFC Status API Integration (Dual Enquiry API)
 * This fetches the definitive status of a transaction directly from HDFC Bank servers.
 */

interface HdfcStatusResponse {
    status: number; // 0 for success, 1 for API failure
    order_no: string;
    reference_no: string;
    order_amt: number;
    order_status: string; // 'Successful', 'Unsuccessful', 'Fraud', 'Cancelled', 'Aborted', 'Timeout'
    order_bank_response?: string;
    order_bank_ref_no?: string;
    error_desc?: string;
    error_code?: string;
}

export const fetchHdfcTransactionStatus = async (orderId: string): Promise<{ success: boolean; data?: HdfcStatusResponse; message?: string }> => {
    try {
        const workingKey = process.env.HDFC_WORKING_KEY;
        const accessCode = process.env.HDFC_ACCESS_CODE;
        const apiUrl = process.env.HDFC_API_URL; // e.g., https://apitest.ccavenue.com

        if (!workingKey || !accessCode || !apiUrl) {
            throw new Error('HDFC API credentials not configured');
        }

        // Create the JSON payload for status enquiry
        const payload = {
            order_no: orderId
        };

        const jsonString = JSON.stringify(payload);

        // Encrypt the payload
        const encRequest = encrypt(jsonString, workingKey);

        // Construct the POST data
        const postData = new url.URLSearchParams({
            enc_request: encRequest,
            access_code: accessCode,
            request_type: 'JSON',
            response_type: 'JSON',
            command: 'orderStatusTracker',
            version: '1.2'
        }).toString();

        // Make the POST request to HDFC server
        const response = await axios.post(`${apiUrl}/apis/servlet/DoWebTrans`, postData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        // Parse the response which comes as query string e.g., status=0&enc_response=...&enc_error_code=
        const parsedResponse = new url.URLSearchParams(response.data);
        const status = parsedResponse.get('status');
        const encResponse = parsedResponse.get('enc_response');
        
        if (status === '1') {
            const errCode = parsedResponse.get('enc_error_code');
            return {
                success: false,
                message: encResponse || `HDFC Status API returned failure with code ${errCode}`
            };
        }

        if (status === '0' && encResponse) {
            // Decrypt the encrypted JSON response
            const decryptedString = decrypt(encResponse, workingKey);
            
            // Remove control characters from decrypted string padding before parsing JSON
            // Notice: AES padding often adds null bytes or invisible chars at the end
            const cleanString = decryptedString.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

            const parsedData: HdfcStatusResponse = JSON.parse(cleanString);

            return {
                success: true,
                data: parsedData
            };
        }

        return {
            success: false,
            message: 'Invalid response from HDFC Status API'
        };
    } catch (error: any) {
        console.error('Error fetching HDFC status:', error);
        return {
            success: false,
            message: error.message || 'Failed to fetch HDFC status'
        };
    }
};
