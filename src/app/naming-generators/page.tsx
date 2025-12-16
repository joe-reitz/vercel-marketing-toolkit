"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Check, CalendarIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

const regionOptions = [
  { value: "Global", label: "Global" },
  { value: "NAMER", label: "NAMER" },
  { value: "EMEA", label: "EMEA" },
  { value: "APAC", label: "APAC" },
  { value: "LATAM", label: "LATAM" },
]

const journeyTypeOptions = [
  { value: "NUR", label: "Nurture" },
  { value: "EM", label: "Email" },
  { value: "AR", label: "Autoresponder" },
  { value: "WEBSITE", label: "Website" },
]

const brandOptions = ["Vercel", "v0"]

const sfdcTypeOptions = [
  { value: "EMAIL", label: "Email" },
  { value: "EVENT", label: "Event" },
  { value: "INT", label: "Integrated" },
  { value: "PPC", label: "PPC" },
  { value: "PRODUCT", label: "Product" },
  { value: "PROGRAM", label: "Program" },
  { value: "PLS", label: "Product Led Sales" },
  { value: "SC", label: "Content Syndication" },
  { value: "SDR", label: "SDR" },
  { value: "WBN", label: "Webinar" },
  { value: "WEBSITE", label: "Website" },
  { value: "SALES", label: "Sales" },
]

const eventSubtypes = ["COMMUNITY", "CORPORATE", "FIELD", "SPONSORED", "PARTNER"]
const ppcSubtypes = ["LinkedIn", "Google", "Bing", "Other"]
const sdrSubtypes = ["Marketing-FUP", "AutoOutbound"]
const webinarSubtypes = ["Vercel", "3rdParty"]
 
const assetTypes = ["Email", "List", "Audience"]

export default function MarketingNameGenerators() {
  const [activeTab, setActiveTab] = useState("sfdc")
  const { toast } = useToast()

  // State for Region Selection
  const [region, setRegion] = useState("")

  // Inflection Journey Name State
  const [journeyType, setJourneyType] = useState("")
  const [brand, setBrand] = useState("")
  const [journeyName, setJourneyName] = useState("")
  const [launchDate, setLaunchDate] = useState<Date | undefined>(undefined)
  const [linearTicketId, setLinearTicketId] = useState<string>("")
  const [generatedJourneyName, setGeneratedJourneyName] = useState("")

  // SFDC Campaign Name State
  const [sfdcType, setSfdcType] = useState("")
  const [sfdcSubtype, setSfdcSubtype] = useState("")
  const [sfdcTopic, setSfdcTopic] = useState("")
  const [sfdcDate, setSfdcDate] = useState<Date | undefined>(undefined)
  const [generatedSfdcName, setGeneratedSfdcName] = useState("")
  const [vendorName, setVendorName] = useState("");
  const formatTextWithHyphens = (text: string): string => text.replace(/\s+/g, "-").toLowerCase();
  // Inflection Asset Name State
  const [assetType, setAssetType] = useState("")
  const [assetName, setAssetName] = useState("")
  const [fullJourneyName, setFullJourneyName] = useState("")
  const [generatedAssetName, setGeneratedAssetName] = useState("")
  const [isCopied, setIsCopied] = useState(false)

  const generateJourneyName = () => {
    const formattedDate = launchDate ? format(launchDate, "yyyyMMdd") : ""
    const formattedName = journeyName.trim().replace(/\s+/g, "-").toLowerCase()
    
    if (region && journeyType && brand && journeyName.length >= 4 && formattedDate && linearTicketId.trim()) {
      const newName = `${region}_${journeyType}_${brand}_${formattedName}_${formattedDate}_${linearTicketId.trim()}`.toLowerCase()
      setGeneratedJourneyName(newName)
      setFullJourneyName(newName)
    } else {
      setGeneratedJourneyName("Please fill in all fields correctly")
    }
  }

  const generateSfdcName = () => {
    // Check if all required fields are filled
    if (!region) {
      setGeneratedSfdcName("Please select a Region");
      return;
    }
    if (!sfdcType) {
      setGeneratedSfdcName("Please select a Campaign Type");
      return;
    }
    if (!sfdcTopic) {
      setGeneratedSfdcName("Please enter a Topic");
      return;
    }
    if (!sfdcDate) {
      setGeneratedSfdcName("Please select a Date");
      return;
    }
  
    // Additional checks for specific campaign types
    if (sfdcType === "EVENT" && !sfdcSubtype) {
      setGeneratedSfdcName("Please select an Event Type");
      return;
    }
    if (sfdcType === "PPC" && !sfdcSubtype) {
      setGeneratedSfdcName("Please select a PPC Type");
      return;
    }
    if (sfdcType === "WBN" && !sfdcSubtype) {
      setGeneratedSfdcName("Please select a Webinar Type");
      return;
    }  
    if (sfdcType === "SDR" && !sfdcSubtype) {
      setGeneratedSfdcName("Please select a SDR Type");
      return;
    }  
    if (sfdcType === "SC" && !vendorName) {
      setGeneratedSfdcName("Please enter a Vendor Name for Content Syndication");
      return;
    }

    // Format the date and generate the name
    const formattedDate = sfdcDate ? format(sfdcDate, "yyyyMMdd") : "";
    let newName = "";
  
    switch (sfdcType) {
      case "EMAIL":
        newName = `${region}_EMAIL_${sfdcTopic}_${formattedDate}`;
        break;
      case "EVENT":
        newName = `${region}_EVENT_${sfdcSubtype}_${sfdcTopic}_${formattedDate}`;
        break;
      case "INT":
        newName = `${region}_INT_${sfdcTopic}_${formattedDate}`;
        break;
      case "PPC":
        newName = `${region}_PPC_${sfdcSubtype}_${sfdcTopic}_${formattedDate}`;
        break;
      case "PRODUCT":
        newName = `${region}_PRODUCT_${sfdcTopic}_${formattedDate}`;
        break;
      case "PROGRAM":
      case "PLS":
        newName = `${region}_${sfdcType}_${sfdcTopic}_${formattedDate}`;
        break;
      case "SC":
        newName = `${region}_SC_${vendorName}_${sfdcTopic}_${formattedDate}`;
        break;
      case "SDR":
        newName =
          sfdcSubtype === "AutoOutbound"
            ? `${region}_SDR_AutoOutbound_${sfdcTopic}`
            : `${region}_SDR_Marketing-FUP_${sfdcTopic}_${formattedDate}`;
        break;
      case "WBN":
        newName = `${region}_WBN_${sfdcSubtype}_${sfdcTopic}_${formattedDate}`;
        break;
      case "WEBSITE":
        newName = `${region}_WEBSITE_${sfdcTopic}_${formattedDate}`;
        break;
      case "SALES":
        newName = `${region}_SALES_${sfdcTopic}_${formattedDate}`;
        break;
    }
  
    // Ensure the output is lowercase and set the generated name
    setGeneratedSfdcName(newName.toLowerCase());
  };

  const generateAssetName = () => {
    if (fullJourneyName && assetName) {
      let prefix = ""
      switch (assetType) {
        case "Email":
          prefix = `EM${assetName}_`
          break
        case "List":
          prefix = `List${assetName}_`
          break
        case "Audience":
          prefix = `Audience${assetName}_`
          break
      }
      const newAssetName = `${prefix}${fullJourneyName}`.toLowerCase()
      setGeneratedAssetName(newAssetName)
    } else {
      setGeneratedAssetName("Please enter both full journey name and asset number")
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    toast({
      title: "Copied!",
      description: "The name has been copied to your clipboard.",
      duration: 2000,
    })
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader className="pb-8">
        <CardTitle>Marketing Name Generators</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sfdc">SFDC Campaign</TabsTrigger>
            <TabsTrigger value="journey">Inflection Journey</TabsTrigger>
            <TabsTrigger value="asset">Inflection Asset</TabsTrigger>
          </TabsList>

          <TabsContent value="sfdc" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sfdcRegion">Region</Label>
              <Select onValueChange={setRegion}>
                <SelectTrigger id="sfdcRegion">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sfdcType">Campaign Type</Label>
              <Select
                onValueChange={(value) => {
                  setSfdcType(value)
                  setSfdcSubtype("")
                }}
              >
                <SelectTrigger id="sfdcType">
                  <SelectValue placeholder="Select campaign type" />
                </SelectTrigger>
                <SelectContent>
                  {sfdcTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {sfdcType === "EVENT" && (
              <div className="space-y-2">
                <Label htmlFor="sfdcSubtype">Event Type</Label>
                <Select onValueChange={setSfdcSubtype}>
                  <SelectTrigger id="sfdcSubtype">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventSubtypes.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {subtype}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sfdcType === "PPC" && (
              <div className="space-y-2">
                <Label htmlFor="sfdcSubtype">PPC Type</Label>
                <Select onValueChange={setSfdcSubtype}>
                  <SelectTrigger id="sfdcSubtype">
                    <SelectValue placeholder="Select PPC type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ppcSubtypes.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {subtype}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sfdcType === "SC" && (
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name</Label>
                <Input
                  id="vendorName"
                  value={vendorName}
                  onChange={(e) => setVendorName(formatTextWithHyphens(e.target.value))}
                  placeholder="Enter vendor name"
                />
              </div>
            )}

            {sfdcType === "SDR" && (
              <div className="space-y-2">
                <Label htmlFor="sfdcSubtype">SDR Type</Label>
                <Select onValueChange={setSfdcSubtype}>
                  <SelectTrigger id="sfdcSubtype">
                    <SelectValue placeholder="Select SDR type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sdrSubtypes.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {subtype}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {sfdcType === "WBN" && (
              <div className="space-y-2">
                <Label htmlFor="sfdcSubtype">Webinar Type</Label>
                <Select onValueChange={setSfdcSubtype}>
                  <SelectTrigger id="sfdcSubtype">
                    <SelectValue placeholder="Select webinar type" />
                  </SelectTrigger>
                  <SelectContent>
                    {webinarSubtypes.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {subtype}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}



            <div className="space-y-2">
              <Label htmlFor="sfdcTopic">Topic</Label>
              <Input
                id="sfdcTopic"
                value={sfdcTopic}
                onChange={(e) => setSfdcTopic(formatTextWithHyphens(e.target.value))}
                placeholder="Enter campaign topic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfdcDate">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !sfdcDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {sfdcDate ? format(sfdcDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={sfdcDate} onSelect={setSfdcDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <Button onClick={generateSfdcName} className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white">
              Generate SFDC Campaign Name
            </Button>

            {generatedSfdcName && (
              <div
                className={`mt-4 p-4 rounded flex items-center justify-between ${generatedSfdcName.startsWith("Please") ? "bg-red-600" : "bg-secondary"}`}
              >
                <div className="flex-1 mr-4">
                  <Label>Generated SFDC Campaign Name:</Label>
                  <p className="text-lg font-mono break-all">{generatedSfdcName}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(generatedSfdcName)}
                  className={cn("transition-colors", isCopied && "bg-green-500 text-white hover:bg-green-600")}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="journey" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select onValueChange={setRegion}>
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="journeyType">Type</Label>
              <Select onValueChange={setJourneyType}>
                <SelectTrigger id="journeyType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {journeyTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Select onValueChange={setBrand}>
                <SelectTrigger id="brand">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brandOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="journeyName">Name</Label>
              <Input
                id="journeyName"
                value={journeyName}
                onChange={(e) => setJourneyName(e.target.value)}
                placeholder="Enter journey name (min 4 characters)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="launchDate">Launch Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !launchDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {launchDate ? format(launchDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={launchDate} onSelect={setLaunchDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linearTicketId">Linear Ticket ID</Label>
              <Input
                id="linearTicketId"
                value={linearTicketId}
                onChange={(e) => setLinearTicketId(e.target.value)}
                placeholder="Enter Linear Ticket ID"
              />
            </div>

            <Button onClick={generateJourneyName} className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white">
              Generate Journey Name
            </Button>

            {generatedJourneyName && (
              <div
                className={`mt-4 p-4 rounded flex items-center justify-between ${generatedJourneyName.startsWith("Please") ? "bg-red-600" : "bg-secondary"}`}
              >
                <div className="flex-1 mr-4">
                  <Label>Generated Journey Name:</Label>
                  <p className="text-lg font-mono break-all">{generatedJourneyName}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(generatedJourneyName)}
                  className={cn("transition-colors", isCopied && "bg-green-500 text-white hover:bg-green-600")}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="asset" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assetType">Asset Type</Label>
              <Select onValueChange={setAssetType}>
                <SelectTrigger id="assetType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {assetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assetNumber">Asset Number</Label>
              <Input
                id="assetNumber"
                type="number"
                min="1"
                step="1"
                value={assetName}
                onChange={(e) => setAssetName(e.target.value)}
                placeholder="Enter asset number (integer)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullJourneyName">Full Journey Name</Label>
              <Input
                id="fullJourneyName"
                value={fullJourneyName}
                onChange={(e) => setJourneyName(formatTextWithHyphens(e.target.value))}
                placeholder="Enter full journey name"
              />
            </div>

            <Button onClick={generateAssetName} className="w-full bg-[#0070f3] hover:bg-[#0060df] text-white">
              Generate Asset Name
            </Button>

            {generatedAssetName && (
              <div
                className={`mt-4 p-4 rounded flex items-center justify-between ${generatedAssetName.startsWith("Please") ? "bg-red-600" : "bg-secondary"}`}
              >
                <div className="flex-1 mr-4">
                  <Label>Generated Asset Name:</Label>
                  <p className="text-lg font-mono break-all">{generatedAssetName}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(generatedAssetName)}
                  className={cn("transition-colors", isCopied && "bg-green-500 text-white hover:bg-green-600")}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

