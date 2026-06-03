import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Palette,
    AppWindow,
    Fingerprint,
    LayoutDashboard,
    Layers,
    ShieldCheck,
    BarChart3,
    FileText,
    Table,
    LineChart,
    Bot,
    Globe,
    Menu,
    Database,
    Server,
    Boxes,
    Upload,
    Move,
    FileDown,
    Sparkles,
} from "lucide-react";

const mdFiles = [
    { title: "Branding", icon: Palette },
    { title: "Dashboards", icon: BarChart3 },
    { title: "Applications", icon: AppWindow },
    { title: "Authentication", icon: Fingerprint },
    { title: "Forms & Validations", icon: FileText },
    { title: "Components & UI", icon: Boxes },
    { title: "Navigation", icon: Menu },
    { title: "Theming", icon: Palette },
    { title: "i18n", icon: Globe },


];

const PoweredPrompt = () => {
    return (

        <section className="py-10">
            <div className="container mx-auto flex flex-col gap-16">
                <div className="flex flex-col gap-6 max-w-4xl mx-auto text-center items-center">
                    <Badge
                        variant={"outline"}
                        className="text-sm text-primary font-normal h-auto [&>svg]:size-3.5! px-2.5 py-1"
                    >
                        <Sparkles className="text-amber-400 fill-amber-400" strokeWidth={"0.75"} />
                        <span>AI Powered Prompts</span>
                    </Badge>


                    <h2 className="md:text-3xl text-xl font-bold ">
                        Stop Explaining Your Code. <br className="hidden md:block" /> Ship Features Faster with Context-Aware Prompts.
                    </h2>
                    <p className=" text-sm text-muted-foreground">
                        Scale your development with agents.md. Our context-aware prompts
                        understand your project&apos;s architecture, components, and logic,
                        delivering precise code blocks instantly.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {mdFiles?.map((value, index) => {
                            return (
                                <Badge
                                    key={index}
                                    variant={"outline"}
                                    className="text-xs text-gray-500  border-border font-normal h-auto [&>svg]:size-3.5 px-2.5 py-1"
                                >
                                    {value?.icon && <value.icon size={14} />}
                                    <span className={"ml-0.5"}>{value?.title}</span>
                                </Badge>
                            );
                        })}
                    </div>
                </div>






            </div>
        </section>

    );
};

export default PoweredPrompt;
