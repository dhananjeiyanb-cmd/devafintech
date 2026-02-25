import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layout } from "@/components/Layout";
import { FileText, Building2, User, Calendar, IndianRupee, Calculator, Download, Shield } from "lucide-react";

interface Form16Data {
  // Part A
  employerName: string;
  employerAddress: string;
  employerTAN: string;
  employeeName: string;
  employeePAN: string;
  assessmentYear: string;
  employmentPeriodFrom: string;
  employmentPeriodTo: string;
  totalTdsDeducted: string;
  totalTdsDeposited: string;
  // Part B
  grossSalary: string;
  allowancesExempt: string;
  perquisites: string;
  standardDeduction: string;
  section80C: string;
  section80D: string;
  section80G: string;
  otherDeductions: string;
  taxRegime: string;
}

const defaultData: Form16Data = {
  employerName: "", employerAddress: "", employerTAN: "",
  employeeName: "", employeePAN: "", assessmentYear: "2025-26",
  employmentPeriodFrom: "2025-04-01", employmentPeriodTo: "2026-03-31",
  totalTdsDeducted: "", totalTdsDeposited: "",
  grossSalary: "", allowancesExempt: "", perquisites: "",
  standardDeduction: "50000", section80C: "", section80D: "", section80G: "",
  otherDeductions: "", taxRegime: "old",
};

const Form16 = () => {
  const [data, setData] = useState<Form16Data>(defaultData);
  const [activeTab, setActiveTab] = useState("partA");

  const update = (field: keyof Form16Data, value: string) => setData(prev => ({ ...prev, [field]: value }));
  const num = (v: string) => parseFloat(v) || 0;

  // Part B calculations
  const grossSalary = num(data.grossSalary);
  const totalExemptions = num(data.allowancesExempt) + num(data.perquisites);
  const netSalary = grossSalary - totalExemptions;
  const standardDeduction = Math.min(num(data.standardDeduction), 50000);
  const incomeFromSalary = Math.max(netSalary - standardDeduction, 0);
  
  const total80C = Math.min(num(data.section80C), 150000);
  const total80D = Math.min(num(data.section80D), 100000);
  const total80G = num(data.section80G);
  const totalChapterVIA = total80C + total80D + total80G + num(data.otherDeductions);
  
  const taxableIncome = Math.max(incomeFromSalary - totalChapterVIA, 0);

  // Old regime tax slabs
  const calculateTax = (income: number) => {
    if (data.taxRegime === "new") {
      // New regime FY 2025-26
      if (income <= 300000) return 0;
      if (income <= 700000) return (income - 300000) * 0.05;
      if (income <= 1000000) return 20000 + (income - 700000) * 0.10;
      if (income <= 1200000) return 50000 + (income - 1000000) * 0.15;
      if (income <= 1500000) return 80000 + (income - 1200000) * 0.20;
      return 140000 + (income - 1500000) * 0.30;
    }
    // Old regime
    if (income <= 250000) return 0;
    if (income <= 500000) return (income - 250000) * 0.05;
    if (income <= 1000000) return 12500 + (income - 500000) * 0.20;
    return 112500 + (income - 1000000) * 0.30;
  };

  const taxPayable = calculateTax(taxableIncome);
  const cess = taxPayable * 0.04;
  const totalTax = Math.round(taxPayable + cess);
  const tdsDeducted = num(data.totalTdsDeducted);
  const refundOrDue = tdsDeducted - totalTax;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary" /> Form 16
            </h1>
            <p className="text-muted-foreground">TDS Certificate for Salaried Employees</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="partA">Part A - TDS Details</TabsTrigger>
            <TabsTrigger value="partB">Part B - Salary & Deductions</TabsTrigger>
            <TabsTrigger value="summary">Tax Summary</TabsTrigger>
          </TabsList>

          {/* PART A */}
          <TabsContent value="partA" className="space-y-6">
            <Card className="gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" /> Employer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Employer Name</Label><Input value={data.employerName} onChange={(e) => update("employerName", e.target.value)} placeholder="Company Pvt. Ltd." /></div>
                  <div><Label>Employer TAN</Label><Input value={data.employerTAN} onChange={(e) => update("employerTAN", e.target.value)} placeholder="DELC12345E" /></div>
                </div>
                <div><Label>Employer Address</Label><Input value={data.employerAddress} onChange={(e) => update("employerAddress", e.target.value)} placeholder="Full address" /></div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Employee Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Employee Name</Label><Input value={data.employeeName} onChange={(e) => update("employeeName", e.target.value)} placeholder="Full name" /></div>
                  <div><Label>Employee PAN</Label><Input value={data.employeePAN} onChange={(e) => update("employeePAN", e.target.value)} placeholder="ABCDE1234F" /></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Assessment Year</Label>
                    <Select value={data.assessmentYear} onValueChange={(v) => update("assessmentYear", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2025-26">AY 2025-26</SelectItem>
                        <SelectItem value="2026-27">AY 2026-27</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Employment From</Label><Input type="date" value={data.employmentPeriodFrom} onChange={(e) => update("employmentPeriodFrom", e.target.value)} /></div>
                  <div><Label>Employment To</Label><Input type="date" value={data.employmentPeriodTo} onChange={(e) => update("employmentPeriodTo", e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-primary" /> TDS Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Total TDS Deducted (₹)</Label><Input type="number" value={data.totalTdsDeducted} onChange={(e) => update("totalTdsDeducted", e.target.value)} placeholder="0" /></div>
                  <div><Label>Total TDS Deposited (₹)</Label><Input type="number" value={data.totalTdsDeposited} onChange={(e) => update("totalTdsDeposited", e.target.value)} placeholder="0" /></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PART B */}
          <TabsContent value="partB" className="space-y-6">
            <Card className="gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-primary" /> Salary Breakup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tax Regime</Label>
                  <Select value={data.taxRegime} onValueChange={(v) => update("taxRegime", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="old">Old Regime</SelectItem>
                      <SelectItem value="new">New Regime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label>Gross Salary (₹)</Label><Input type="number" value={data.grossSalary} onChange={(e) => update("grossSalary", e.target.value)} placeholder="0" /></div>
                  <div><Label>Exempt Allowances - HRA, LTA etc. (₹)</Label><Input type="number" value={data.allowancesExempt} onChange={(e) => update("allowancesExempt", e.target.value)} placeholder="0" /></div>
                  <div><Label>Perquisites (₹)</Label><Input type="number" value={data.perquisites} onChange={(e) => update("perquisites", e.target.value)} placeholder="0" /></div>
                  <div><Label>Standard Deduction (₹)</Label><Input type="number" value={data.standardDeduction} onChange={(e) => update("standardDeduction", e.target.value)} placeholder="50000" /></div>
                </div>
              </CardContent>
            </Card>

            {data.taxRegime === "old" && (
              <Card className="gradient-card shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-card-foreground flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" /> Chapter VI-A Deductions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Section 80C - PPF, ELSS, LIC (₹)</Label>
                      <Input type="number" value={data.section80C} onChange={(e) => update("section80C", e.target.value)} placeholder="0" />
                      <p className="text-xs text-muted-foreground mt-1">Max ₹1,50,000</p>
                    </div>
                    <div>
                      <Label>Section 80D - Health Insurance (₹)</Label>
                      <Input type="number" value={data.section80D} onChange={(e) => update("section80D", e.target.value)} placeholder="0" />
                      <p className="text-xs text-muted-foreground mt-1">Max ₹1,00,000 (incl. parents)</p>
                    </div>
                    <div><Label>Section 80G - Donations (₹)</Label><Input type="number" value={data.section80G} onChange={(e) => update("section80G", e.target.value)} placeholder="0" /></div>
                    <div><Label>Other Deductions (₹)</Label><Input type="number" value={data.otherDeductions} onChange={(e) => update("otherDeductions", e.target.value)} placeholder="0" /></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SUMMARY */}
          <TabsContent value="summary" className="space-y-6">
            <Card className="gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-card-foreground flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" /> Tax Computation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Row label="Gross Salary" value={grossSalary} />
                  <Row label="Less: Exempt Allowances" value={-totalExemptions} />
                  <Divider />
                  <Row label="Net Salary" value={netSalary} bold />
                  <Row label="Less: Standard Deduction" value={-standardDeduction} />
                  <Divider />
                  <Row label="Income from Salary" value={incomeFromSalary} bold />
                  
                  {data.taxRegime === "old" && totalChapterVIA > 0 && (
                    <>
                      <div className="pt-2">
                        <p className="text-sm font-semibold text-card-foreground">Chapter VI-A Deductions</p>
                      </div>
                      {total80C > 0 && <Row label="  Section 80C" value={-total80C} sub />}
                      {total80D > 0 && <Row label="  Section 80D" value={-total80D} sub />}
                      {total80G > 0 && <Row label="  Section 80G" value={-total80G} sub />}
                      {num(data.otherDeductions) > 0 && <Row label="  Other Deductions" value={-num(data.otherDeductions)} sub />}
                      <Row label="Total Deductions (VI-A)" value={-totalChapterVIA} />
                    </>
                  )}
                  
                  <Divider />
                  <Row label="Taxable Income" value={taxableIncome} bold highlight />
                  <Row label={`Tax (${data.taxRegime === "new" ? "New" : "Old"} Regime)`} value={taxPayable} />
                  <Row label="Health & Education Cess (4%)" value={cess} />
                  <Divider />
                  <Row label="Total Tax Liability" value={totalTax} bold />
                  <Row label="Less: TDS Deducted" value={-tdsDeducted} />
                  <Divider />
                  
                  <div className={`flex justify-between items-center p-4 rounded-lg ${refundOrDue >= 0 ? 'bg-income/10 border border-income/20' : 'bg-destructive/10 border border-destructive/20'}`}>
                    <span className="font-bold text-lg">{refundOrDue >= 0 ? "Refund Due" : "Tax Payable"}</span>
                    <span className={`text-2xl font-bold ${refundOrDue >= 0 ? 'text-income' : 'text-expense'}`}>
                      ₹{Math.abs(Math.round(refundOrDue)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Card className="gradient-card shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-card-foreground text-sm">Important Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Verify Form 16 details with Form 26AS on the TRACES portal</li>
                  <li>• Form 16 is mandatory for filing ITR for salaried individuals</li>
                  <li>• Part A is issued by the employer; Part B is the salary annexure</li>
                  <li>• Keep Form 16 safe — it serves as proof of income for loans & visa</li>
                  <li>• This calculator is for estimation only. Consult a CA for exact filing.</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

// Helper components
const Row = ({ label, value, bold, sub, highlight }: { label: string; value: number; bold?: boolean; sub?: boolean; highlight?: boolean }) => (
  <div className={`flex justify-between items-center ${sub ? 'pl-2' : ''} ${highlight ? 'bg-primary/5 p-2 rounded-lg' : ''}`}>
    <span className={`text-sm ${bold ? 'font-semibold text-card-foreground' : 'text-muted-foreground'}`}>{label}</span>
    <span className={`text-sm ${bold ? 'font-bold text-card-foreground' : 'text-muted-foreground'}`}>
      {value < 0 ? '-' : ''}₹{Math.abs(Math.round(value)).toLocaleString()}
    </span>
  </div>
);

const Divider = () => <div className="border-t border-border" />;

export default Form16;
