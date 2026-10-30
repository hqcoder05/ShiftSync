package com.shiftsync.shift.service;

import com.google.ortools.Loader;
import com.google.ortools.sat.*;
import com.shiftsync.auth.entity.User;
import com.shiftsync.availability.entity.*;
import com.shiftsync.availability.repository.*;
import com.shiftsync.employment.entity.*;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.ShiftStatus;
import com.shiftsync.shift.repository.*;
import com.shiftsync.skill.entity.*;
import com.shiftsync.skill.repository.StaffSkillRepository;
import com.shiftsync.store.entity.*;
import com.shiftsync.store.repository.*;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in: mvn test -P cpsat-benchmark -Dtest=CpSatProductionBenchmark.
 * Direct production dry-run, mocked I/O; independent CP-SAT maximum-coverage oracle.
 * Deliberately restricted to one ISO week, 8h shifts, no historical assignments,
 * spatial placement, expired skills, leave requests or cross-store contracts.
 */
class CpSatProductionBenchmark {
    static final LocalDate MONDAY = LocalDate.of(2030, 11, 4);
    record Person(User user, int limit, Set<Integer> skills, boolean[] days, int blocked) {}
    record Fixture(UUID store, List<Person> people, List<Shift> shifts, int demand) {}
    record Placement(int person, int shift) {}
    record Result(List<Placement> placements, double ms, String status, double bound) {}
    static UUID id(long value) { return new UUID(0, value); }

    @Test void benchmark() throws Exception {
        Loader.loadNativeLibraries();
        ((ch.qos.logback.classic.Logger)org.slf4j.LoggerFactory.getLogger(AutoScheduleService.class))
                .setLevel(ch.qos.logback.classic.Level.WARN);
        List<String> rows = new ArrayList<>();
        rows.add("staff,demand,seed,method,filled,coverage_pct,runtime_ms,weekly_utilization_stddev,violations,status,coverage_upper_bound");
        for (int[] scale : new int[][]{{10,25},{50,100},{200,500},{10,45},{50,225}}) {
            production(fixture(scale[0],scale[1],41)); // warm-up, excluded
            for (int seed : new int[]{42,43,44}) {
                Fixture f = fixture(scale[0],scale[1],seed);
                for (String method : List.of("production","cp-sat")) {
                    Result r = method.equals("production") ? production(f) : oracle(f);
                    int violations = validate(f,r.placements);
                    assertEquals(0,violations,"Independent constraint validation: "+method);
                    String row = String.format(Locale.ROOT,"%d,%d,%d,%s,%d,%.3f,%.3f,%.6f,%d,%s,%.0f",
                            scale[0],scale[1],seed,method,r.placements.size(),100.0*r.placements.size()/f.demand,
                            r.ms,stddev(f,r.placements),violations,r.status,r.bound);
                    rows.add(row); System.out.println("BENCH,"+row);
                }
            }
        }
        Files.createDirectories(Path.of("target"));
        Files.write(Path.of("target/production-scheduler-benchmark.csv"),rows);
        Files.writeString(Path.of("target/production-scheduler-benchmark-environment.txt"),
                "java="+System.getProperty("java.version")+"\nos="+System.getProperty("os.name")+
                "\narch="+System.getProperty("os.arch")+"\nprocessors="+Runtime.getRuntime().availableProcessors()+
                "\nmaxHeap="+Runtime.getRuntime().maxMemory()+"\nOR-Tools=9.11.4210\nCP-SAT workers=4, timeout=5s, random_seed=42\n");
    }

    static Fixture fixture(int count,int demand,int seed) {
        Random random = new Random(seed);
        List<Person> people = new ArrayList<>();
        for(int i=0;i<count;i++) {
            Set<Integer> skills = new HashSet<>(); skills.add(i%3);
            if(random.nextBoolean()) skills.add((i+1)%3);
            boolean[] days = new boolean[5];
            for(int d=0;d<5;d++) days[d]=random.nextDouble()>=0.15;
            people.add(new Person(User.builder().id(id(1000+i)).fullName("Bench "+i)
                    .systemRole(SystemRole.STAFF).build(),i%3==0?24:40,skills,days,
                    i%7==0?random.nextInt(5):-1));
        }
        List<Shift> shifts = new ArrayList<>();
        // Thirty distinct shift/skill combinations; headcount sums exactly to demand.
        for(int s=0;s<30;s++) {
            int required=demand/30+(s<demand%30?1:0); if(required==0)continue;
            int day=s/6, type=(s/3)%2, skill=s%3;
            Skill role=Skill.builder().id(id(10+skill)).name("Skill "+skill).build();
            Shift shift=Shift.builder().id(id(100+s)).shiftDate(MONDAY.plusDays(day))
                    .startTime(LocalTime.of(type==0?6:14,0)).endTime(LocalTime.of(type==0?14:22,0))
                    .status(ShiftStatus.DRAFT).requirements(List.of(ShiftSkillRequirement.builder()
                            .id(id(200+s)).skill(role).requiredCount(required).build())).build();
            shifts.add(shift);
        }
        return new Fixture(id(1),people,shifts,demand);
    }

    static Result production(Fixture f) {
        ShiftRepository shifts=mock(ShiftRepository.class);
        ShiftAssignmentRepository assignments=mock(ShiftAssignmentRepository.class);
        EmploymentRepository employees=mock(EmploymentRepository.class);
        StaffSkillRepository skills=mock(StaffSkillRepository.class);
        AvailabilityRepository availability=mock(AvailabilityRepository.class);
        BlackoutDateRepository blackouts=mock(BlackoutDateRepository.class);
        StoreConfigurationRepository config=mock(StoreConfigurationRepository.class);
        SchedulerConfigurationRepository scoring=mock(SchedulerConfigurationRepository.class);
        when(shifts.findByStoreIdAndShiftDateBetween(any(),any(),any())).thenReturn(f.shifts);
        List<Employment> employment=new ArrayList<>();
        List<StaffSkill> qualifications=new ArrayList<>();
        List<Availability> free=new ArrayList<>();
        List<BlackoutDate> blocked=new ArrayList<>();
        for(Person p:f.people) {
            employment.add(Employment.builder().user(p.user).status(EmploymentStatus.ACTIVE)
                    .contractType(ContractType.builder().id(id(p.limit)).maxWeeklyHours(p.limit).build()).build());
            for(int skill:p.skills) qualifications.add(StaffSkill.builder().staffId(p.user.getId())
                    .skillId(id(10+skill)).level(SkillLevel.EXPERT).build());
            for(int d=0;d<5;d++) if(p.days[d]) free.add(Availability.builder().user(p.user)
                    .dayOfWeek((short)(d+1)).startTime(LocalTime.of(6,0)).endTime(LocalTime.of(22,0)).build());
            if(p.blocked>=0) blocked.add(BlackoutDate.builder().staffId(p.user.getId()).date(MONDAY.plusDays(p.blocked)).build());
        }
        when(employees.findByStoreIdAndStatus(any(),any())).thenReturn(employment);
        when(employees.findByUserIdInAndStatus(any(),any())).thenReturn(employment);
        when(skills.findByStaffIdIn(any())).thenReturn(qualifications);
        when(availability.findByUser_IdIn(any())).thenReturn(free);
        when(blackouts.findByStaffIdInAndDateBetween(any(),any(),any())).thenReturn(blocked);
        when(config.findByStoreId(any())).thenReturn(Optional.of(StoreConfiguration.builder()
                .storeId(f.store).minRestHours(11).availabilityToleranceMinutes(0).build()));
        AutoScheduleService service=new AutoScheduleService(shifts,assignments,employees,skills,availability,blackouts,config,scoring);
        AutoScheduleRequest request=new AutoScheduleRequest();request.setStartDate(MONDAY);
        request.setEndDate(MONDAY.plusDays(4));request.setDryRun(true);
        AutoScheduleResult result; double ms;
        // No database transaction is measured; satisfy the dry-run rollback marker only.
        try(var transaction=mockStatic(org.springframework.transaction.interceptor.TransactionAspectSupport.class)) {
            transaction.when(org.springframework.transaction.interceptor.TransactionAspectSupport::currentTransactionStatus)
                    .thenReturn(mock(org.springframework.transaction.TransactionStatus.class));
            long start=System.nanoTime(); result=service.autoSchedule(f.store,request);
            ms=(System.nanoTime()-start)/1e6;
        }
        List<Placement> out=new ArrayList<>();
        for(var shift:result.getPlannedShifts()) for(var assignment:shift.getShiftAssignments()) {
            int si=-1,pi=-1;
            for(int s=0;s<f.shifts.size();s++)if(f.shifts.get(s).getId().equals(shift.getId()))si=s;
            for(int p=0;p<f.people.size();p++)if(f.people.get(p).user.getId().equals(assignment.getStaffId()))pi=p;
            assertTrue(si>=0&&pi>=0);out.add(new Placement(pi,si));
        }
        assertEquals(out.size(),result.getTotalAssignedSlots());
        assertEquals(out.size(),result.getQuality().getCoveredSlots());
        // Repository writes are mocks; production dry-run would roll them back.
        return new Result(out,ms,"HEURISTIC",Double.NaN);
    }

    static boolean eligible(Fixture f,int p,int s) {
        Person person=f.people.get(p); Shift shift=f.shifts.get(s);
        int day=(int)java.time.temporal.ChronoUnit.DAYS.between(MONDAY,shift.getShiftDate());
        return person.days[day]&&person.blocked!=day&&person.skills.contains(
                (int)shift.getRequirements().get(0).getSkill().getId().getLeastSignificantBits()-10);
    }
    static LocalDateTime start(Shift s){return s.getShiftDate().atTime(s.getStartTime());}
    static LocalDateTime end(Shift s){return s.getShiftDate().atTime(s.getEndTime());}
    static boolean conflict(Shift a,Shift b) {
        if(start(a).isAfter(start(b))){Shift t=a;a=b;b=t;}
        return Duration.between(end(a),start(b)).toMinutes()<11*60;
    }

    static Result oracle(Fixture f) {
        long begin=System.nanoTime(); CpModel model=new CpModel();
        BoolVar[][] x=new BoolVar[f.people.size()][f.shifts.size()];
        List<BoolVar> all=new ArrayList<>();
        for(int p=0;p<x.length;p++) {
            List<BoolVar> work=new ArrayList<>();
            for(int s=0;s<f.shifts.size();s++) if(eligible(f,p,s)) {
                x[p][s]=model.newBoolVar("p"+p+"s"+s);work.add(x[p][s]);all.add(x[p][s]);
                for(int t=0;t<s;t++)if(x[p][t]!=null&&conflict(f.shifts.get(t),f.shifts.get(s)))
                    model.addAtMostOne(new Literal[]{x[p][t],x[p][s]});
            }
            model.addLessOrEqual(LinearExpr.sum(work.toArray(new BoolVar[0])),f.people.get(p).limit/8);
        }
        for(int s=0;s<f.shifts.size();s++) {
            List<BoolVar> assigned=new ArrayList<>();
            for(int p=0;p<x.length;p++)if(x[p][s]!=null)assigned.add(x[p][s]);
            model.addLessOrEqual(LinearExpr.sum(assigned.toArray(new BoolVar[0])),f.shifts.get(s).getRequirements().get(0).getRequiredCount());
        }
        model.maximize(LinearExpr.sum(all.toArray(new BoolVar[0])));
        CpSolver solver=new CpSolver();solver.getParameters().setMaxTimeInSeconds(5).setNumSearchWorkers(4).setRandomSeed(42);
        CpSolverStatus status=solver.solve(model);
        assertTrue(status==CpSolverStatus.OPTIMAL||status==CpSolverStatus.FEASIBLE,"Solver returned "+status);
        List<Placement> out=new ArrayList<>();
        for(int p=0;p<x.length;p++)for(int s=0;s<f.shifts.size();s++)
            if(x[p][s]!=null&&solver.booleanValue(x[p][s]))out.add(new Placement(p,s));
        return new Result(out,(System.nanoTime()-begin)/1e6,status.name(),solver.bestObjectiveBound());
    }

    static int validate(Fixture f,List<Placement> placements) {
        int violations=0;int[] counts=new int[f.shifts.size()],hours=new int[f.people.size()];
        Set<Placement> unique=new HashSet<>();
        for(Placement a:placements) {
            if(!unique.add(a))violations++;
            if(!eligible(f,a.person,a.shift))violations++;
            counts[a.shift]++;hours[a.person]+=8;
        }
        for(int s=0;s<counts.length;s++)if(counts[s]>f.shifts.get(s).getRequirements().get(0).getRequiredCount())violations++;
        for(int p=0;p<hours.length;p++)if(hours[p]>f.people.get(p).limit)violations++;
        for(int i=0;i<placements.size();i++)for(int j=0;j<i;j++) {
            Placement a=placements.get(i),b=placements.get(j);
            if(a.person==b.person&&conflict(f.shifts.get(a.shift),f.shifts.get(b.shift)))violations++;
        }
        return violations;
    }
    static double stddev(Fixture f,List<Placement> placements) {
        double[] loads=new double[f.people.size()];
        for(Placement a:placements)loads[a.person]+=8.0/f.people.get(a.person).limit;
        double mean=Arrays.stream(loads).average().orElse(0);
        return Math.sqrt(Arrays.stream(loads).map(v->(v-mean)*(v-mean)).average().orElse(0));
    }
}
