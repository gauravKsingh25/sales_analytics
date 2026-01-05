"use client";
import { useState } from 'react';
import { useUploadMutation, useUploadStatus } from '../../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploadId, setUploadId] = useState(null);
  const { mutate, isLoading: isUploading } = useUploadMutation();
  const { data: status, isLoading: loadingStatus } = useUploadStatus(uploadId);

  function handleFileChange(e) {
    setFile(e.target.files[0]);
  }

  function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    mutate(formData, {
      onSuccess: (data) => setUploadId(data.uploadId),
    });
  }

  const getStatusColor = () => {
    if (!status) return 'default';
    switch (status.status) {
      case 'done': return 'default';
      case 'processing': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const progressPercent = status ? (status.processedRows / status.totalRows) * 100 : 0;

  return (
    <div className="py-8 px-4 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Vouchers</h1>
        <p className="text-muted-foreground">Import your Excel sales register files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Excel File
          </CardTitle>
          <CardDescription>
            Select an Excel file (.xlsx) containing your quarterly sales data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Excel File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={isUploading || (status && status.status === 'processing')}
              />
              {file && (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={!file || isUploading || (status && status.status === 'processing')}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {uploadId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Upload Status</span>
              <Badge variant={getStatusColor()}>
                {status?.status || 'Unknown'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStatus ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : status ? (
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vouchers Processed</span>
                  <span className="font-medium">{status.processedRows} / {status.totalRows}</span>
                </div>
                
                {status.status === 'processing' && (
                  <div className="space-y-2">
                    <Progress value={progressPercent} />
                    <p className="text-xs text-center text-muted-foreground">
                      {progressPercent.toFixed(1)}% complete
                    </p>
                  </div>
                )}

                {status.errorsList && status.errorsList.length > 0 && (
                  <div className="border border-yellow-200 bg-yellow-50 rounded-md p-4">
                    <div className="flex items-center gap-2 font-semibold text-yellow-800 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings ({status.errorsList.length})
                    </div>
                    <ul className="list-disc ml-6 text-sm text-yellow-700 max-h-48 overflow-y-auto space-y-1">
                      {status.errorsList.slice(0, 10).map((err, i) => <li key={i}>{err}</li>)}
                      {status.errorsList.length > 10 && (
                        <li className="text-yellow-600">...and {status.errorsList.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {status.status === 'done' && (
                  <div className="border border-green-200 bg-green-50 rounded-md p-4">
                    <div className="flex items-center gap-2 font-semibold text-green-800 mb-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Upload Complete!
                    </div>
                    <p className="text-sm text-green-700">
                      Successfully processed {status.processedRows} vouchers.{' '}
                      <a href="/vouchers" className="underline font-medium hover:text-green-900">
                        View all vouchers →
                      </a>
                    </p>
                  </div>
                )}

                {status.status === 'failed' && (
                  <div className="border border-red-200 bg-red-50 rounded-md p-4">
                    <div className="flex items-center gap-2 font-semibold text-red-800 mb-2">
                      <XCircle className="h-5 w-5" />
                      Upload Failed
                    </div>
                    <p className="text-sm text-red-700">
                      Please check the file format and try again.
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
