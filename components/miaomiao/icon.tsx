// Original icons drawn on a 16 × 16 grid. Shared by navigation and category cards.
const paths:Record<string,string> = {
 home:'M1 7 8 1 15 7M3 6V15H13V6M6 15V10H10V15',
 rooms:'M1 1H7V7H1ZM9 1H15V7H9ZM1 9H7V15H1ZM9 9H15V15H9Z',
 tools:'M10 1 15 6 6 15 1 10ZM8 3 13 8M3 8 8 13',
 forum:'M1 2H15V11H6L2 15V11H1Z',
 updates:'M8 1V5M8 11V15M1 8H5M11 8H15M6 6H10V10H6Z',
 person:'M5 1H11V7H5ZM2 15V12L5 9H11L14 12V15',
 code:'M5 3 1 8 5 13M11 3 15 8 11 13M9 1 7 15',
 ruler:'M2 1H6V10H15V14H2ZM3 4H6M3 7H6M9 11V14M12 11V14',
 cube:'M8 1 15 5V11L8 15 1 11V5ZM1 5 8 9 15 5M8 9V15',
 window:'M1 2H15V14H1ZM1 6H15M3 4H4M6 4H7',
 file:'M3 1H10L14 5V15H3ZM10 1V5H14M6 8H11M6 11H11',
 film:'M1 2H15V14H1ZM4 2V14M12 2V14M1 6H4M1 10H4M12 6H15M12 10H15',
 frame:'M1 6V1H6M10 1H15V6M15 10V15H10M6 15H1V10M3 12 7 7 10 10 12 8 14 11M10 4H11V5H10Z',
 chat:'M1 2H15V11H6L2 15V11H1ZM4 5H12M4 8H10',
 pencil:'M2 11 11 2 14 5 5 14 1 15ZM9 4 12 7',
 globe:'M1 8H15M8 1V15M5 1 3 5V11L5 15M11 1 13 5V11L11 15M4 1H12L15 4V12L12 15H4L1 12V4Z',
 layers:'M1 5 8 1 15 5 8 9ZM1 9 8 13 15 9M1 12 8 16 15 12',
 agent:'M2 5H14V14H2ZM8 5V1M5 8H6V9H5ZM10 8H11V9H10ZM5 12H11',
 desk:'M1 2H15V11H1ZM8 11V15M4 15H12',
 book:'M1 2H6L8 4 10 2H15V14H10L8 16 6 14H1ZM8 4V16',
 steps:'M1 14H6V9H11V4H15M11 1H15V5',
 plus:'M8 1V15M1 8H15',arrow:'M1 8H15M10 3 15 8 10 13',check:'M1 8 6 13 15 3',
};
const aliases:Record<string,string>={web:'window',video:'film',image:'frame'};
export function PixelIcon({name,className=''}:{name:string;className?:string}) {
 return <svg className={'mm-icon '+className} viewBox="0 0 16 16" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" strokeLinecap="square" aria-hidden="true" focusable="false"><path d={paths[aliases[name]??name]??paths.book}/></svg>;
}
export function CategoryIcon({icon,className}:{icon:string;className?:string}) {return <PixelIcon name={icon} className={className}/>;}
